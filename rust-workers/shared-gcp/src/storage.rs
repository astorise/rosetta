use google_cloud_storage::client::{Client, ClientConfig};
use google_cloud_storage::http::objects::download::GetObjectRequest;
use google_cloud_storage::http::objects::upload::{UploadObjectRequest, UploadType};
use std::sync::Arc;

pub struct StorageHelper {
    client: Arc<Client>,
}

impl StorageHelper {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let config = ClientConfig::default().with_auth().await?;
        let client = Arc::new(Client::new(config));
        Ok(Self { client })
    }

    pub async fn download(&self, bucket: &str, object: &str) -> Result<Vec<u8>, google_cloud_storage::http::Error> {
        let req = GetObjectRequest {
            bucket: bucket.to_string(),
            object: object.to_string(),
            ..Default::default()
        };
        self.client.download_object(&req).await
    }

    pub async fn upload(&self, bucket: &str, object: &str, data: Vec<u8>, content_type: &str) -> Result<(), google_cloud_storage::http::Error> {
        let req = UploadObjectRequest {
            bucket: bucket.to_string(),
            ..Default::default()
        };
        self.client.upload_object(&req, data, &UploadType::Simple(google_cloud_storage::http::objects::upload::Media {
            name: object.to_string().into(),
            content_type: content_type.to_string().into(),
            content_length: None,
        })).await?;
        Ok(())
    }
}
