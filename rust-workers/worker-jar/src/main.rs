use shared_gcp::event::CloudEvent;
use shared_gcp::server::{create_router, EventHandler};
use shared_gcp::storage::StorageHelper;
use shared_gcp::firestore::FirestoreHelper;
use shared_gcp::yaml::{DeterministicTags, merge_frontmatter};
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::process::Command;

struct JarWorker {
    storage: Arc<StorageHelper>,
    firestore: Arc<FirestoreHelper>,
}

impl EventHandler for JarWorker {
    fn handle(&self, event: CloudEvent) -> impl std::future::Future<Output = Result<(), String>> + Send {
        let storage = self.storage.clone();
        let firestore = self.firestore.clone();
        
        async move {
            if let Some(data) = event.data {
                if !data.name.ends_with(".jar") {
                    return Ok(());
                }
                tracing::info!("Processing JAR source: {}", data.name);
                
                let jar_bytes = storage.download(&data.bucket, &data.name).await
                    .map_err(|e| format!("Download error: {}", e))?;
                
                let tmp_path = format!("/tmp/{}", data.name.replace("/", "_"));
                tokio::fs::write(&tmp_path, jar_bytes).await
                    .map_err(|e| format!("Write error: {}", e))?;
                
                let cfr_output = Command::new("java")
                    .arg("-jar")
                    .arg("/opt/cfr.jar")
                    .arg(&tmp_path)
                    .output()
                    .await
                    .map_err(|e| format!("CFR execution error: {}", e))?;
                
                let decompiled_text = String::from_utf8_lossy(&cfr_output.stdout).to_string();
                let _ = tokio::fs::remove_file(&tmp_path).await;
                
                let semantic_yaml = "technologies:\n  - java-6\nsemantic_tags:\n  - semantic-flattening\n";
                
                let det_tags = DeterministicTags {
                    source_filename: data.name.clone(),
                    extraction_timestamp: "2024-01-01T00:00:00Z".to_string(),
                    document_type: "jar".to_string(),
                };
                
                let frontmatter = merge_frontmatter(det_tags.clone(), semantic_yaml);
                let markdown = format!("{}\n\n{}", frontmatter, decompiled_text);
                
                let md_name = format!("{}.md", data.name.replace("/", "_"));
                storage.upload("rag-markdown-bucket", &md_name, markdown.into_bytes(), "text/markdown").await
                    .map_err(|e| format!("Upload error: {}", e))?;
                    
                firestore.insert_metadata("processed_docs", &md_name, &det_tags).await
                    .map_err(|e| format!("Firestore error: {}", e))?;
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
    
    let worker = JarWorker { storage, firestore };
    let app = create_router(worker);
    
    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("worker-jar listening on 8080");
    axum::serve(listener, app).await?;
    Ok(())
}
