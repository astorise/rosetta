use axum::{body::Bytes, extract::State, http::StatusCode, routing::post, Router};
use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use shared_gcp::firestore::FirestoreHelper;
use std::sync::Arc;
use urlencoding::encode;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct AuthEventData {
    email: Option<String>,
    uid: String,
}

#[derive(Deserialize, Debug)]
struct StructuredAuthEvent {
    data: AuthEventData,
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
    app_base_url: String,
}

#[derive(Clone)]
struct AppState {
    firestore_helper: Arc<FirestoreHelper>,
    email_client: Arc<EmailClient>,
}

impl EmailClient {
    fn new(project_id: &str) -> Self {
        Self {
            client: Client::new(),
            api_key: std::env::var("EMAIL_API_KEY").expect("EMAIL_API_KEY not set"),
            api_url: std::env::var("EMAIL_API_URL").expect("EMAIL_API_URL not set"),
            admin_email: std::env::var("ADMIN_EMAIL").expect("ADMIN_EMAIL not set"),
            app_base_url: std::env::var("APP_BASE_URL")
                .unwrap_or_else(|_| format!("https://{}.web.app", project_id)),
        }
    }

    async fn send_notification(&self, auth_data: &AuthEventData) -> Result<(), reqwest::Error> {
        let payload = EmailPayload {
            from: "onboarding@rosetta.com",
            to: &self.admin_email,
            subject: "New User Registered".to_string(),
            text: build_notification_text(auth_data, &self.app_base_url),
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

fn build_admin_review_url(app_base_url: &str, uid: &str) -> String {
    format!(
        "{}/?view=admin&uid={}",
        app_base_url.trim_end_matches('/'),
        encode(uid)
    )
}

fn build_notification_text(auth_data: &AuthEventData, app_base_url: &str) -> String {
    let review_url = build_admin_review_url(app_base_url, &auth_data.uid);

    match auth_data.email.as_deref() {
        Some(email) => format!(
            "A new user has registered and may need write access.\nUID: {}\nEmail: {}\nReview access: {}",
            auth_data.uid, email, review_url
        ),
        None => format!(
            "A new user has registered and may need write access.\nUID: {}\nReview access: {}",
            auth_data.uid, review_url
        ),
    }
}

fn parse_auth_event_data(body: &[u8]) -> Result<AuthEventData, String> {
    serde_json::from_slice(body).or_else(|direct_err| {
        serde_json::from_slice::<StructuredAuthEvent>(body)
            .map(|event| event.data)
            .map_err(|structured_err| {
                format!(
                    "invalid auth payload: direct parse failed ({direct_err}); structured CloudEvent parse failed ({structured_err})"
                )
            })
    })
}

async fn handle_event(State(state): State<AppState>, body: Bytes) -> StatusCode {
    info!("Received onboarding request.");

    match parse_auth_event_data(&body) {
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

            if let Err(e) = state.email_client.send_notification(&auth_data).await {
                error!("Failed to send email notification: {}", e);
                return StatusCode::INTERNAL_SERVER_ERROR;
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
    let email_client = Arc::new(EmailClient::new(&project_id));
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

#[cfg(test)]
mod tests {
    use super::{
        build_admin_review_url, build_notification_text, parse_auth_event_data, AuthEventData,
    };

    #[test]
    fn parses_direct_onboarding_payload() {
        let body = br#"{"uid":"user-123","email":"teacher@example.com"}"#;
        let auth_data = parse_auth_event_data(body).expect("payload should parse");

        assert_eq!(auth_data.uid, "user-123");
        assert_eq!(auth_data.email.as_deref(), Some("teacher@example.com"));
    }

    #[test]
    fn parses_structured_cloudevent_payload() {
        let body = br#"{
            "specversion":"1.0",
            "id":"evt-1",
            "source":"//firebaseauth.googleapis.com/projects/demo-project",
            "type":"google.firebase.auth.user.v1.created",
            "data":{"uid":"user-456","email":"reader@example.com"}
        }"#;
        let auth_data = parse_auth_event_data(body).expect("CloudEvent payload should parse");

        assert_eq!(auth_data.uid, "user-456");
        assert_eq!(auth_data.email.as_deref(), Some("reader@example.com"));
    }

    #[test]
    fn parses_null_email_payload() {
        let body = br#"{"uid":"user-789","email":null}"#;
        let auth_data = parse_auth_event_data(body).expect("payload should parse with null email");

        assert_eq!(auth_data.uid, "user-789");
        assert!(auth_data.email.is_none());
    }

    #[test]
    fn notification_text_always_contains_uid() {
        let auth_data = AuthEventData {
            uid: "user-abc".to_string(),
            email: Some("teacher@example.com".to_string()),
        };

        let text = build_notification_text(&auth_data, "https://rosetta.web.app");

        assert!(text.contains("UID: user-abc"));
        assert!(text.contains("Email: teacher@example.com"));
        assert!(text.contains("Review access: https://rosetta.web.app/?view=admin&uid=user-abc"));
    }

    #[test]
    fn notification_text_uses_uid_when_email_is_missing() {
        let auth_data = AuthEventData {
            uid: "user-def".to_string(),
            email: None,
        };

        let text = build_notification_text(&auth_data, "https://rosetta.web.app");

        assert!(text.contains("UID: user-def"));
        assert!(!text.contains("Email:"));
        assert!(text.contains("Review access: https://rosetta.web.app/?view=admin&uid=user-def"));
    }

    #[test]
    fn admin_review_url_encodes_uid_in_query_string() {
        let url = build_admin_review_url("https://rosetta.web.app/", "uid:with spaces");

        assert_eq!(
            url,
            "https://rosetta.web.app/?view=admin&uid=uid%3Awith%20spaces"
        );
    }
}
