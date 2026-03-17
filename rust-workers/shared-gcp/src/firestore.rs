use google_cloud_firestore::client::{Client, ClientConfig};
use google_cloud_firestore::http::v1::Document;
use std::collections::HashMap;

pub struct FirestoreHelper {
    client: Client,
    project_id: String,
}

impl FirestoreHelper {
    pub async fn new(project_id: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let config = ClientConfig::default().with_auth().await?;
        let client = Client::new(config).await?;
        Ok(Self {
            client,
            project_id: project_id.to_string(),
        })
    }

    pub async fn insert_metadata(&self, collection: &str, document_id: &str, data: Document) -> Result<(), google_cloud_firestore::errors::FirestoreError> {
        self.client.create_document(
            &self.project_id,
            &format!("(default)/documents/{}", collection),
            document_id,
            data
        ).await?;
        Ok(())
    }
}
