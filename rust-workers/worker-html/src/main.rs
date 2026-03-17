use shared_gcp::event::CloudEvent;
use shared_gcp::server::{create_router, EventHandler};
use shared_gcp::storage::StorageHelper;
use shared_gcp::firestore::FirestoreHelper;
use shared_gcp::yaml::{DeterministicTags, merge_frontmatter};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Semaphore;
use async_zip::tokio::read::seek::ZipFileReader;
use std::io::Cursor;
use tokio_util::compat::TokioAsyncReadCompatExt;

struct HtmlWorker {
    storage: Arc<StorageHelper>,
    firestore: Arc<FirestoreHelper>,
    api_semaphore: Arc<Semaphore>,
    output_bucket: Arc<String>,
}

impl EventHandler for HtmlWorker {
    fn handle(&self, event: CloudEvent) -> impl std::future::Future<Output = Result<(), String>> + Send {
        let storage = self.storage.clone();
        let firestore = self.firestore.clone();
        let api_semaphore = self.api_semaphore.clone();
        let output_bucket = self.output_bucket.clone();
        
        async move {
            if let Some(data) = event.data {
                if !data.name.ends_with(".zip") {
                    return Ok(());
                }
                tracing::info!("Processing ZIP source: {}", data.name);
                
                let zip_bytes = storage.download(&data.bucket, &data.name).await
                    .map_err(|e| format!("Download error: {}", e))?;
                
                let cursor = Cursor::new(zip_bytes);
                let mut reader = ZipFileReader::new(cursor.compat()).await
                    .map_err(|e| format!("ZIP error: {}", e))?;
                
                for i in 0..reader.file().entries().len() {
                    let entry = reader.file().entries().get(i).unwrap();
                    let filename = entry.filename().as_str().unwrap_or("").to_string();
                    if filename.ends_with(".html") || filename.ends_with(".htm") {
                        let mut entry_reader = reader.reader_with_entry(i).await
                            .map_err(|e| format!("Entry {:?}", e))?;
                        
                        let mut html_content = String::new();
                        entry_reader.read_to_string_checked(&mut html_content).await
                            .map_err(|e| format!("Content error: {}", e))?;
                        
                        let text: String = {
                            let document = scraper::Html::parse_document(&html_content);
                            document.root_element().text().collect::<Vec<_>>().join(" ")
                        };
                        
                        let _permit = api_semaphore.acquire().await.unwrap();
                        
                        let semantic_yaml = "technologies:\n  - java-something\nsemantic_tags:\n  - web\n";
                        
                        let det_tags = DeterministicTags {
                            source_filename: format!("{}#{}", data.name, filename),
                            extraction_timestamp: "2024-01-01T00:00:00Z".to_string(),
                            document_type: "html".to_string(),
                        };
                        
                        let frontmatter = merge_frontmatter(det_tags.clone(), semantic_yaml);
                        let markdown = format!("{}\n\n{}", frontmatter, text);
                        
                        let md_name = format!("{}_{}.md", data.name.replace("/", "_"), filename.replace("/", "_"));
                        storage.upload(output_bucket.as_str(), &md_name, markdown.into_bytes(), "text/markdown").await
                            .map_err(|e| format!("Upload error: {}", e))?;
                            
                        firestore.insert_metadata("processed_docs", &md_name, &det_tags).await
                            .map_err(|e| format!("Firestore error: {}", e))?;
                    }
                }
            }
            Ok(())
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt::init();
    let project_id = std::env::var("PROJECT_ID")?;
    let output_bucket = Arc::new(std::env::var("MD_BUCKET")?);
    let storage = Arc::new(StorageHelper::new().await?);
    let firestore = Arc::new(FirestoreHelper::new(&project_id).await?);
    let api_semaphore = Arc::new(Semaphore::new(10));
    
    let worker = HtmlWorker { storage, firestore, api_semaphore, output_bucket };
    let app = create_router(worker);
    
    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("worker-html listening on 8080");
    axum::serve(listener, app).await?;
    Ok(())
}
