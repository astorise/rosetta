use google_cloud_storage::client::Storage;
use std::sync::Arc;

pub struct StorageHelper {
    client: Arc<Storage>,
}

impl StorageHelper {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let client = Storage::builder().build().await?;
        Ok(Self { client: Arc::new(client) })
    }

    pub async fn download(&self, bucket: &str, object: &str) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let mut resp = self.client.read_object(bucket, object).send().await?;
        let mut contents = Vec::new();
        while let Some(chunk) = resp.next().await.transpose()? {
            contents.extend_from_slice(&chunk);
        }
        Ok(contents)
    }

    pub async fn upload(&self, bucket: &str, object: &str, data: Vec<u8>, content_type: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let _resp = self.client.write_object(bucket, object, bytes::Bytes::from(data))
            .set_content_type(content_type)
            .send_buffered()
            .await?;
        Ok(())
    }
}
