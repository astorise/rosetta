use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Json, Router,
};
use std::sync::Arc;
use crate::event::CloudEvent;

pub trait EventHandler: Send + Sync + 'static {
    fn handle(&self, event: CloudEvent) -> impl std::future::Future<Output = Result<(), String>> + Send;
}

pub fn create_router<H: EventHandler>(handler: H) -> Router {
    let state = Arc::new(handler);
    Router::new()
        .route("/", post(handle_post::<H>))
        .with_state(state)
}

async fn handle_post<H: EventHandler>(
    State(handler): State<Arc<H>>,
    Json(payload): Json<CloudEvent>,
) -> impl IntoResponse {
    match handler.handle(payload).await {
        Ok(_) => StatusCode::OK,
        Err(e) => {
            tracing::error!("Error handling event: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}
