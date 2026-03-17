use google_cloud_storage::client::Storage;
use std::borrow::Cow;
use std::sync::Arc;

pub struct StorageHelper {
    client: Arc<Storage>,
}

impl StorageHelper {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let client = Storage::builder().build().await?;
        Ok(Self {
            client: Arc::new(client),
        })
    }

    pub async fn download(
        &self,
        bucket: &str,
        object: &str,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        let bucket = bucket_resource(bucket);
        let mut resp = self
            .client
            .read_object(bucket.as_ref(), object)
            .send()
            .await?;
        let mut contents = Vec::new();
        while let Some(chunk) = resp.next().await.transpose()? {
            contents.extend_from_slice(&chunk);
        }
        Ok(contents)
    }

    pub async fn upload(
        &self,
        bucket: &str,
        object: &str,
        data: Vec<u8>,
        content_type: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let bucket = bucket_resource(bucket);
        let _resp = self
            .client
            .write_object(bucket.as_ref(), object, bytes::Bytes::from(data))
            .set_content_type(content_type)
            .send_buffered()
            .await?;
        Ok(())
    }
}

fn bucket_resource(bucket: &str) -> Cow<'_, str> {
    const BUCKET_PREFIX: &str = "projects/_/buckets/";

    if bucket.starts_with(BUCKET_PREFIX) {
        Cow::Borrowed(bucket)
    } else {
        Cow::Owned(format!("{BUCKET_PREFIX}{bucket}"))
    }
}

#[cfg(test)]
mod tests {
    use super::bucket_resource;

    #[test]
    fn normalizes_plain_bucket_names() {
        assert_eq!(
            bucket_resource("rosetta-490508-raw-docs"),
            "projects/_/buckets/rosetta-490508-raw-docs"
        );
    }

    #[test]
    fn keeps_bucket_resource_names() {
        assert_eq!(
            bucket_resource("projects/_/buckets/rosetta-490508-raw-docs"),
            "projects/_/buckets/rosetta-490508-raw-docs"
        );
    }
}
