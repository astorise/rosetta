use crate::event::{CloudEvent, StorageObjectData};
use axum::{
    body::Bytes,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::post,
    Router,
};
use std::sync::Arc;

pub trait EventHandler: Send + Sync + 'static {
    fn handle(
        &self,
        event: CloudEvent,
    ) -> impl std::future::Future<Output = Result<(), String>> + Send;
}

pub fn create_router<H: EventHandler>(handler: H) -> Router {
    let state = Arc::new(handler);
    Router::new()
        .route("/", post(handle_post::<H>))
        .with_state(state)
}

async fn handle_post<H: EventHandler>(
    State(handler): State<Arc<H>>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let payload = match parse_event(&headers, &body) {
        Ok(payload) => payload,
        Err(e) => {
            tracing::error!("Invalid event payload: {}", e);
            return StatusCode::UNPROCESSABLE_ENTITY;
        }
    };

    match handler.handle(payload).await {
        Ok(_) => StatusCode::OK,
        Err(e) => {
            tracing::error!("Error handling event: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        }
    }
}

fn parse_event(headers: &HeaderMap, body: &[u8]) -> Result<CloudEvent, String> {
    if let Some(event) = parse_binary_event(headers, body)? {
        return Ok(event);
    }

    serde_json::from_slice(body).map_err(|e| format!("failed to parse structured CloudEvent: {e}"))
}

fn parse_binary_event(headers: &HeaderMap, body: &[u8]) -> Result<Option<CloudEvent>, String> {
    let id = header_value(headers, "ce-id");
    let source = header_value(headers, "ce-source");
    let event_type = header_value(headers, "ce-type");

    let (Some(id), Some(source), Some(event_type)) = (id, source, event_type) else {
        return Ok(None);
    };

    let data = if body.is_empty() {
        None
    } else {
        Some(
            serde_json::from_slice::<StorageObjectData>(body)
                .map_err(|e| format!("failed to parse binary CloudEvent data: {e}"))?,
        )
    };

    Ok(Some(CloudEvent {
        specversion: header_value(headers, "ce-specversion"),
        id,
        source,
        event_type,
        subject: header_value(headers, "ce-subject"),
        time: header_value(headers, "ce-time"),
        data,
    }))
}

fn header_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get(name)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_owned())
}

#[cfg(test)]
mod tests {
    use super::parse_event;
    use axum::http::HeaderMap;

    #[test]
    fn parses_structured_cloudevent() {
        let headers = HeaderMap::new();
        let body = br#"{
            "specversion":"1.0",
            "id":"evt-1",
            "source":"//storage.googleapis.com/projects/_/buckets/test",
            "type":"google.cloud.storage.object.v1.finalized",
            "subject":"objects/file.pdf",
            "data":{"name":"file.pdf","bucket":"test","contentType":"application/pdf"}
        }"#;

        let event = parse_event(&headers, body).expect("structured CloudEvent should parse");

        assert_eq!(event.id, "evt-1");
        assert_eq!(event.event_type, "google.cloud.storage.object.v1.finalized");
        assert_eq!(event.data.expect("data should exist").name, "file.pdf");
    }

    #[test]
    fn parses_binary_cloudevent() {
        let mut headers = HeaderMap::new();
        headers.insert("ce-id", "evt-2".parse().unwrap());
        headers.insert(
            "ce-source",
            "//storage.googleapis.com/projects/_/buckets/test"
                .parse()
                .unwrap(),
        );
        headers.insert(
            "ce-type",
            "google.cloud.storage.object.v1.finalized".parse().unwrap(),
        );
        headers.insert("ce-specversion", "1.0".parse().unwrap());
        headers.insert("ce-subject", "objects/file.zip".parse().unwrap());

        let body =
            br#"{"name":"file.zip","bucket":"test","contentType":"application/zip","size":"123"}"#;
        let event = parse_event(&headers, body).expect("binary CloudEvent should parse");

        assert_eq!(event.id, "evt-2");
        assert_eq!(event.subject.as_deref(), Some("objects/file.zip"));
        assert_eq!(event.data.expect("data should exist").bucket, "test");
    }

    #[test]
    fn rejects_invalid_binary_payload() {
        let mut headers = HeaderMap::new();
        headers.insert("ce-id", "evt-3".parse().unwrap());
        headers.insert(
            "ce-source",
            "//storage.googleapis.com/projects/_/buckets/test"
                .parse()
                .unwrap(),
        );
        headers.insert(
            "ce-type",
            "google.cloud.storage.object.v1.finalized".parse().unwrap(),
        );

        let err = parse_event(&headers, b"{").expect_err("invalid payload should fail");

        assert!(err.contains("failed to parse binary CloudEvent data"));
    }
}
