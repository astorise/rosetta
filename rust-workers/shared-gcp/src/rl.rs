use google_cloud_storage::client::{Client, ClientConfig};
use serde::Serialize;
use std::env;

#[derive(Serialize)]
pub struct RlPair {
    pub prompt: String,
    pub chosen: String,
    pub rejected: String,
}

pub async fn append_rl_pair(rl_pair: &RlPair) -> Result<(), Box<dyn std::error::Error>> {
    let project_id = env::var("GCP_PROJECT_ID").expect("GCP_PROJECT_ID not set");
    let bucket_name = format!("{}-rag-markdown-bucket", project_id);
    let object_name = "rl_dataset.jsonl";

    let config = ClientConfig::default().with_auth().await?;
    let client = Client::new(config);

    // Get existing content
    let existing_content = match client.object().download(&bucket_name, object_name).await {
        Ok(bytes) => String::from_utf8(bytes)?,
        Err(google_cloud_storage::http::Error::Response(err)) if err.code() == 404 => {
            "".to_string()
        }
        Err(e) => return Err(Box::new(e)),
    };

    // Append new line
    let new_line = serde_json::to_string(rl_pair)?;
    let new_content = if existing_content.is_empty() {
        new_line
    } else {
        format!("{}
{}", existing_content, new_line)
    };

    // Upload new content
    client
        .object()
        .upload(
            &bucket_name,
            object_name,
            new_content.as_bytes(),
            "application/jsonl",
            None,
        )
        .await?;

    Ok(())
}
