use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Represents a basic CloudEvent payload.
/// Eventarc typically sends application/cloudevents+json or HTTP headers (binary mode).
/// If it's structured mode, the body is a full CloudEvent JSON.
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CloudEvent {
    pub specversion: Option<String>,
    pub id: String,
    pub source: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub subject: Option<String>,
    pub time: Option<String>,
    pub data: Option<StorageObjectData>,
}

/// A simplified Storage Object Data payload inside `data`
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct StorageObjectData {
    pub name: String,
    pub bucket: String,
    #[serde(rename = "contentType")]
    pub content_type: Option<String>,
    pub size: Option<String>,
    #[serde(default)]
    pub metadata: Option<Value>,
}
