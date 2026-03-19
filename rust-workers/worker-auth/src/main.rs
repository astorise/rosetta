use axum::{routing::post, Router, Extension};
use cloudevents_sdk_axum::{AxumEvent, CloudEventDecoder};
use serde::{Deserialize, Serialize};
use log::{info, error};
use shared_gcp::firestore::FirestoreHelper;
use std::sync::Arc;
use reqwest::Client;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct AuthEventData {
    email: String,
    uid: String,
}

#[derive(Serialize, Debug)]
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

        info!("Successfully sent email notification to {}", self.admin_email);
        Ok(())
    }
}


async fn handle_event(
    Extension(firestore_helper): Extension<Arc<FirestoreHelper>>,
    Extension(email_client): Extension<Arc<EmailClient>>,
    event: AxumEvent
) {
    info!("Received event: {:?}", event);
    let event = event.into_event();

    match serde_json::from_value::<AuthEventData>(event.data().unwrap().clone()) {
        Ok(auth_data) => {
            info!("Successfully deserialized auth data: {:?}", auth_data);
            let user_role = UserRole { role: "reader".to_string() };
            
            if let Err(e) = firestore_helper.insert_metadata("user_roles", &auth_data.uid, &user_role).await {
                error!("Failed to create user role in Firestore: {}", e);
                return; // Exit early if Firestore fails
            }
            info!("Successfully created user role in Firestore.");

            if let Err(e) = email_client.send_notification(&auth_data.email).await {
                error!("Failed to send email notification: {}", e);
            }
        }
        Err(e) => {
            error!("Failed to deserialize auth event data: {}", e);
        }
    }
}

#[tokio::main]
async fn main() {
    env_logger::init();

    let project_id = std::env::var("GCP_PROJECT_ID").expect("GCP_PROJECT_ID not set");
    let firestore_helper = Arc::new(FirestoreHelper::new(&project_id).await.unwrap());
    let email_client = Arc::new(EmailClient::new());

    let app = Router::new()
        .route("/", post(handle_event))
        .layer(Extension(CloudEventDecoder))
        .layer(Extension(firestore_helper))
        .layer(Extension(email_client));

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();

    info!("Listening on port {}", port);

    axum::serve(listener, app).await.unwrap();
}
