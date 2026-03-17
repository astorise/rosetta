use shared_gcp::event::{CloudEvent};
use shared_gcp::server::{create_router, EventHandler};
use shared_gcp::storage::StorageHelper;
use shared_gcp::firestore::FirestoreHelper;
use shared_gcp::yaml::{DeterministicTags, merge_frontmatter};
use std::sync::Arc;
use tokio::net::TcpListener;

struct PdfWorker {
    storage: Arc<StorageHelper>,
    firestore: Arc<FirestoreHelper>,
}

impl EventHandler for PdfWorker {
    fn handle(&self, event: CloudEvent) -> impl std::future::Future<Output = Result<(), String>> + Send {
        let storage = self.storage.clone();
        let _firestore = self.firestore.clone();
        async move {
            tracing::info!("Received event: {:?}", event.id);
            if let Some(data) = event.data {
                if !data.name.ends_with(".pdf") {
                    return Ok(());
                }
                tracing::info!("Processing PDF: {}", data.name);
                let pdf_bytes = storage.download(&data.bucket, &data.name).await
                    .map_err(|e| format!("Download error: {}", e))?;
                
                let text = pdf_extract::extract_text_from_mem(&pdf_bytes)
                    .map_err(|e| format!("Extract error: {:?}", e))?;
                
                let semantic_yaml = "technologies:\n  - legacy\nsemantic_tags:\n  - extracted\n";
                
                let det_tags = DeterministicTags {
                    source_filename: data.name.clone(),
                    extraction_timestamp: "2024-01-01T00:00:00Z".to_string(), 
                    document_type: "pdf".to_string(),
                };
                
                let frontmatter = merge_frontmatter(det_tags, semantic_yaml);
                let markdown = format!("{}\n\n{}", frontmatter, text);
                
                storage.upload("rag-markdown-bucket", &format!("{}.md", data.name), markdown.into_bytes(), "text/markdown").await
                    .map_err(|e| format!("Upload error: {}", e))?;
            }
            Ok(())
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt::init();
    let storage = Arc::new(StorageHelper::new().await?);
    let firestore = Arc::new(FirestoreHelper::new("my-project-id").await?);
    
    let worker = PdfWorker { storage, firestore };
    let app = create_router(worker);
    
    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("worker-pdf listening on 8080");
    axum::serve(listener, app).await?;
    Ok(())
}
