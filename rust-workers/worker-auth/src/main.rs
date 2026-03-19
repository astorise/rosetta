use axum::{extract::State, http::StatusCode, routing::post, Router};
use cloudevents::{Data, Event};
use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use shared_gcp::firestore::FirestoreHelper;
use std::sync::Arc;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct AuthEventData {
    email: String,
    uid: String,
}

#[derive(Deserialize, Serialize, Debug)]
struct UserRole {
    role: String,
}

#[derive(Serialize)]
struct EmailPayload<'a> {
    from: &'a str,
    to: &'a str,
    subject: String,
    text: String,
}

struct EmailClient {
    client: Client,
    api_key: String,
    api_url: String,
    admin_email: String,
}

#[derive(Clone)]
struct AppState {
    firestore_helper: Arc<FirestoreHelper>,
    email_client: Arc<EmailClient>,
}

impl EmailClient {
    fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: std::env::var("EMAIL_API_KEY").expect("EMAIL_API_KEY not set"),
            api_url: std::env::var("EMAIL_API_URL").expect("EMAIL_API_URL not set"),
            admin_email: std::env::var("ADMIN_EMAIL").expect("ADMIN_EMAIL not set"),
        }
    }

    async fn send_notification(&self, user_email: &str) -> Result<(), reqwest::Error> {
        let payload = EmailPayload {
            from: "onboarding@rosetta.com",
            to: &self.admin_email,
            subject: "New User Registered".to_string(),
            text: format!("A new user with email {} has registered.", user_email),
        };

        self.client
            .post(&self.api_url)
            .bearer_auth(&self.api_key)
            .json(&payload)
            .send()
            .await?
            .error_for_status()?;

        info!(
            "Successfully sent email notification to {}",
            self.admin_email
        );
        Ok(())
    }
}

fn parse_auth_event_data(event: &Event) -> Result<AuthEventData, String> {
    let payload = match event.data() {
        Some(Data::Json(value)) => value.clone(),
        Some(Data::String(value)) => {
            serde_json::from_str(value).map_err(|e| format!("invalid string event payload: {e}"))?
        }
        Some(Data::Binary(value)) => serde_json::from_slice(value)
            .map_err(|e| format!("invalid binary event payload: {e}"))?,
        None => return Err("missing CloudEvent data".to_string()),
    };

    serde_json::from_value(payload).map_err(|e| format!("invalid auth event payload: {e}"))
}

async fn handle_event(State(state): State<AppState>, event: Event) -> StatusCode {
    info!("Received event: {:?}", event);

    match parse_auth_event_data(&event) {
        Ok(auth_data) => {
            info!("Successfully deserialized auth data: {:?}", auth_data);
            let user_role = UserRole {
                role: "reader".to_string(),
            };

            if let Err(e) = state
                .firestore_helper
                .insert_metadata("user_roles", &auth_data.uid, &user_role)
                .await
            {
                error!("Failed to create user role in Firestore: {}", e);
                return StatusCode::INTERNAL_SERVER_ERROR;
            }
            info!("Successfully created user role in Firestore.");

            if let Err(e) = state.email_client.send_notification(&auth_data.email).await {
                error!("Failed to send email notification: {}", e);
            }

            StatusCode::OK
        }
        Err(e) => {
            error!("Failed to deserialize auth event data: {}", e);
            StatusCode::UNPROCESSABLE_ENTITY
        }
    }
}

#[tokio::main]
async fn main() {
    env_logger::init();

    let project_id = std::env::var("GCP_PROJECT_ID").expect("GCP_PROJECT_ID not set");
    let firestore_helper = Arc::new(FirestoreHelper::new(&project_id).await.unwrap());
    let email_client = Arc::new(EmailClient::new());
    let state = AppState {
        firestore_helper,
        email_client,
    };

    let app = Router::new()
        .route("/", post(handle_event))
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .unwrap();

    info!("Listening on port {}", port);

    axum::serve(listener, app).await.unwrap();
}
