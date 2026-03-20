use chrono::{SecondsFormat, Utc};
use google_cloud_auth::credentials::{AccessTokenCredentials, Builder as GoogleCredentialsBuilder};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use shared_gcp::event::CloudEvent;
use shared_gcp::firestore::FirestoreHelper;
use shared_gcp::server::{create_router, EventHandler};
use shared_gcp::storage::StorageHelper;
use shared_gcp::yaml::{merge_frontmatter, DeterministicTags};
use std::sync::Arc;
use tokio::net::TcpListener;

const CLOUD_PLATFORM_SCOPE: &str = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_VERTEX_LOCATION: &str = "us-central1";
const DEFAULT_GEMINI_MODEL: &str = "gemini-2.5-flash";
const ALLOWED_TECHNOLOGIES: &[&str] = &["java-6", "pacbase", "tapestry-5.4", "maven-3", "unknown"];

struct PdfWorker {
    storage: Arc<StorageHelper>,
    firestore: Arc<FirestoreHelper>,
    gemini: Arc<GeminiClient>,
    output_bucket: Arc<String>,
}

impl EventHandler for PdfWorker {
    fn handle(
        &self,
        event: CloudEvent,
    ) -> impl std::future::Future<Output = Result<(), String>> + Send {
        let storage = self.storage.clone();
        let firestore = self.firestore.clone();
        let gemini = self.gemini.clone();
        let output_bucket = self.output_bucket.clone();
        async move {
            tracing::info!("Received event: {:?}", event.id);
            if let Some(data) = event.data {
                if !data.name.ends_with(".pdf") {
                    return Ok(());
                }
                tracing::info!("Processing PDF: {}", data.name);
                let pdf_bytes = storage
                    .download(&data.bucket, &data.name)
                    .await
                    .map_err(|e| format!("Download error: {}", e))?;

                let text = pdf_extract::extract_text_from_mem(&pdf_bytes)
                    .map_err(|e| format!("Extract error: {:?}", e))?;

                let extraction_timestamp = current_timestamp();
                let analysis = gemini
                    .analyze_pdf(&data.bucket, &data.name)
                    .await
                    .map_err(|e| format!("Gemini error: {}", e))?
                    .finalize(&data.name, &text);
                let semantic_yaml = analysis.semantic_yaml();

                let det_tags = DeterministicTags {
                    source_filename: data.name.clone(),
                    extraction_timestamp: extraction_timestamp.clone(),
                    document_type: "pdf".to_string(),
                };

                let frontmatter = merge_frontmatter(det_tags.clone(), &semantic_yaml);
                let md_name = format!("{}.md", data.name);
                let metadata_doc_id = firestore_document_id(&md_name);
                let markdown = build_markdown(&analysis, &frontmatter, &text);
                let metadata = ProcessedDocMetadata {
                    title: analysis.title.clone(),
                    excerpt: analysis.excerpt.clone(),
                    summary: analysis.summary.clone(),
                    technologies: analysis.technologies.clone(),
                    semantic_tags: analysis.semantic_tags.clone(),
                    source_filename: det_tags.source_filename.clone(),
                    extraction_timestamp: det_tags.extraction_timestamp.clone(),
                    document_type: det_tags.document_type.clone(),
                    created_at: extraction_timestamp,
                    markdown_bucket: output_bucket.as_ref().clone(),
                    markdown_object: md_name.clone(),
                    analysis_model: gemini.model_name().to_string(),
                };

                storage
                    .upload(
                        output_bucket.as_str(),
                        &md_name,
                        markdown.into_bytes(),
                        "text/markdown",
                    )
                    .await
                    .map_err(|e| format!("Upload error: {}", e))?;

                firestore
                    .insert_metadata("processed_docs", &metadata_doc_id, &metadata)
                    .await
                    .map_err(|e| format!("Firestore error: {}", e))?;
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
    let vertex_location =
        std::env::var("VERTEX_LOCATION").unwrap_or_else(|_| DEFAULT_VERTEX_LOCATION.to_string());
    let gemini_model =
        std::env::var("GEMINI_MODEL").unwrap_or_else(|_| DEFAULT_GEMINI_MODEL.to_string());
    let storage = Arc::new(StorageHelper::new().await?);
    let firestore = Arc::new(FirestoreHelper::new(&project_id).await?);
    let gemini = Arc::new(GeminiClient::new(
        project_id.clone(),
        vertex_location,
        gemini_model,
    )?);

    let worker = PdfWorker {
        storage,
        firestore,
        gemini,
        output_bucket,
    };
    let app = create_router(worker);

    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("worker-pdf listening on 8080");
    axum::serve(listener, app).await?;
    Ok(())
}

fn firestore_document_id(object_name: &str) -> String {
    object_name.replace("/", "_")
}

fn current_timestamp() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn build_markdown(analysis: &DocumentAnalysis, frontmatter: &str, extracted_text: &str) -> String {
    let summary_section = if analysis.summary == analysis.excerpt {
        String::new()
    } else {
        format!("\n## Summary\n\n{}\n", analysis.summary)
    };

    format!(
        "{frontmatter}\n# {}\n\n{}\n{summary_section}\n## Extracted Text\n\n{}",
        analysis.title,
        analysis.excerpt,
        extracted_text.trim()
    )
}

fn build_analysis_prompt() -> &'static str {
    "You are a senior legacy document analyst preparing metadata for a RAG corpus.\n\
Read the attached PDF and return concise JSON metadata for cataloging.\n\
- title: a short human-readable document title.\n\
- excerpt: one sentence no longer than 220 characters.\n\
- summary: 2 to 4 sentences focused on what a developer or maintainer would learn from this document.\n\
- technologies: choose only values from the allowed enum. Use [\"unknown\"] if nothing clearly matches.\n\
- semantic_tags: 3 to 8 lowercase hyphenated tags about the main topics, APIs, or business concepts.\n\
Use the document's dominant language."
}

fn analysis_response_schema() -> serde_json::Value {
    json!({
        "type": "object",
        "required": ["title", "excerpt", "summary", "technologies", "semantic_tags"],
        "properties": {
            "title": {
                "type": "string",
                "description": "Human-readable document title."
            },
            "excerpt": {
                "type": "string",
                "description": "Single-sentence teaser for UI cards."
            },
            "summary": {
                "type": "string",
                "description": "Short multi-sentence summary focused on developer value."
            },
            "technologies": {
                "type": "array",
                "description": "Best matching legacy technologies from the allowed enum.",
                "items": {
                    "type": "string",
                    "enum": ALLOWED_TECHNOLOGIES
                }
            },
            "semantic_tags": {
                "type": "array",
                "description": "Lowercase hyphenated topic tags.",
                "items": {
                    "type": "string"
                }
            }
        }
    })
}

fn strip_code_fences(input: &str) -> &str {
    let trimmed = input.trim();

    if let Some(stripped) = trimmed
        .strip_prefix("```json")
        .and_then(|value| value.strip_suffix("```"))
    {
        return stripped.trim();
    }

    if let Some(stripped) = trimmed
        .strip_prefix("```")
        .and_then(|value| value.strip_suffix("```"))
    {
        return stripped.trim();
    }

    trimmed
}

fn normalize_whitespace(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn truncate_chars(input: &str, max_chars: usize) -> String {
    let truncated: String = input.chars().take(max_chars).collect();
    truncated.trim().to_string()
}

fn fallback_title_from_filename(source_name: &str) -> String {
    let file_name = source_name.rsplit('/').next().unwrap_or(source_name);
    let without_suffix = file_name.strip_suffix(".pdf").unwrap_or(file_name);
    let readable = without_suffix.replace(['_', '-'], " ");
    truncate_chars(&normalize_whitespace(&readable), 120)
}

fn fallback_excerpt(extracted_text: &str) -> String {
    let normalized = normalize_whitespace(extracted_text);
    truncate_chars(&normalized, 220)
}

fn normalize_technologies(values: Vec<String>) -> Vec<String> {
    let mut normalized = Vec::new();

    for value in values {
        let candidate = value.trim().to_lowercase();
        if candidate.is_empty()
            || !ALLOWED_TECHNOLOGIES
                .iter()
                .any(|allowed| allowed == &candidate.as_str())
            || normalized.iter().any(|existing| existing == &candidate)
        {
            continue;
        }
        normalized.push(candidate);
    }

    if normalized.is_empty() {
        vec!["unknown".to_string()]
    } else {
        normalized
    }
}

fn slugify_tag(input: &str) -> String {
    let mut slug = String::new();
    let mut previous_dash = false;

    for ch in input.trim().chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            previous_dash = false;
        } else if !previous_dash {
            slug.push('-');
            previous_dash = true;
        }
    }

    slug.trim_matches('-').to_string()
}

fn normalize_semantic_tags(values: Vec<String>) -> Vec<String> {
    let mut normalized = Vec::new();

    for value in values {
        let candidate = slugify_tag(&value);
        if candidate.is_empty() || normalized.iter().any(|existing| existing == &candidate) {
            continue;
        }
        normalized.push(candidate);
        if normalized.len() == 8 {
            break;
        }
    }

    if normalized.is_empty() {
        vec!["pdf-document".to_string()]
    } else {
        normalized
    }
}

#[derive(Clone, Debug)]
struct GeminiClient {
    http: Client,
    credentials: AccessTokenCredentials,
    project_id: String,
    location: String,
    model: String,
}

impl GeminiClient {
    fn new(
        project_id: String,
        location: String,
        model: String,
    ) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let credentials = GoogleCredentialsBuilder::default()
            .with_scopes([CLOUD_PLATFORM_SCOPE])
            .build_access_token_credentials()?;

        Ok(Self {
            http: Client::new(),
            credentials,
            project_id,
            location,
            model,
        })
    }

    fn model_name(&self) -> &str {
        &self.model
    }

    async fn analyze_pdf(
        &self,
        bucket: &str,
        object_name: &str,
    ) -> Result<DocumentAnalysis, String> {
        let access_token = self
            .credentials
            .access_token()
            .await
            .map_err(|e| format!("Failed to obtain access token: {}", e))?;
        let url = format!(
            "https://aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models/{}:generateContent",
            self.project_id, self.location, self.model
        );
        let file_uri = format!("gs://{}/{}", bucket, object_name);
        let request_body = json!({
            "contents": [{
                "role": "user",
                "parts": [
                    { "text": build_analysis_prompt() },
                    {
                        "fileData": {
                            "mimeType": "application/pdf",
                            "fileUri": file_uri
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1024,
                "thinkingConfig": {
                    "thinkingBudget": 0
                },
                "responseMimeType": "application/json",
                "responseJsonSchema": analysis_response_schema()
            }
        });

        let response = self
            .http
            .post(url)
            .bearer_auth(access_token.token)
            .json(&request_body)
            .send()
            .await
            .map_err(|e| format!("Failed to call Vertex AI: {}", e))?;
        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| format!("Failed to read Vertex AI response: {}", e))?;

        if !status.is_success() {
            return Err(format!(
                "Vertex AI request failed with status {}: {}",
                status, body
            ));
        }

        let response: GenerateContentResponse = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to decode Vertex AI response: {}", e))?;
        let prompt_feedback = response.prompt_feedback.as_ref();
        let candidate_text = response
            .first_text_part()
            .map(str::to_owned)
            .ok_or_else(|| {
                if let Some(prompt_feedback) = prompt_feedback {
                    if let Some(block_reason) = prompt_feedback.block_reason.as_deref() {
                        format!(
                            "Vertex AI returned no candidate text. Block reason: {}",
                            block_reason
                        )
                    } else {
                        format!(
                            "Vertex AI returned no candidate text. Prompt feedback: {:?}",
                            prompt_feedback
                        )
                    }
                } else {
                    "Vertex AI returned no candidate text.".to_string()
                }
            })?;

        serde_json::from_str::<DocumentAnalysis>(strip_code_fences(&candidate_text)).map_err(|e| {
            format!(
                "Failed to parse Gemini JSON response: {}. Raw response: {}",
                e, candidate_text
            )
        })
    }
}

#[derive(Debug, Deserialize)]
struct GenerateContentResponse {
    #[serde(default)]
    candidates: Vec<GenerateCandidate>,
    #[serde(default, rename = "promptFeedback")]
    prompt_feedback: Option<PromptFeedback>,
}

impl GenerateContentResponse {
    fn first_text_part(&self) -> Option<&str> {
        self.candidates
            .iter()
            .flat_map(|candidate| candidate.content.parts.iter())
            .find_map(|part| part.text.as_deref())
    }
}

#[derive(Debug, Deserialize)]
struct GenerateCandidate {
    content: GenerateContent,
}

#[derive(Debug, Deserialize)]
struct GenerateContent {
    #[serde(default)]
    parts: Vec<GeneratePart>,
}

#[derive(Debug, Deserialize)]
struct GeneratePart {
    #[serde(default)]
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PromptFeedback {
    #[serde(default, rename = "blockReason")]
    block_reason: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct DocumentAnalysis {
    #[serde(default)]
    title: String,
    #[serde(default)]
    excerpt: String,
    #[serde(default)]
    summary: String,
    #[serde(default)]
    technologies: Vec<String>,
    #[serde(default, rename = "semantic_tags")]
    semantic_tags: Vec<String>,
}

impl DocumentAnalysis {
    fn finalize(mut self, source_name: &str, extracted_text: &str) -> Self {
        self.title = if self.title.trim().is_empty() {
            fallback_title_from_filename(source_name)
        } else {
            truncate_chars(&normalize_whitespace(&self.title), 120)
        };

        self.summary = if self.summary.trim().is_empty() {
            fallback_excerpt(extracted_text)
        } else {
            truncate_chars(&normalize_whitespace(&self.summary), 700)
        };

        self.excerpt = if self.excerpt.trim().is_empty() {
            truncate_chars(&self.summary, 220)
        } else {
            truncate_chars(&normalize_whitespace(&self.excerpt), 220)
        };

        if self.excerpt.is_empty() {
            self.excerpt = fallback_excerpt(extracted_text);
        }

        self.technologies = normalize_technologies(self.technologies);
        self.semantic_tags = normalize_semantic_tags(self.semantic_tags);
        self
    }

    fn semantic_yaml(&self) -> String {
        let technologies = self
            .technologies
            .iter()
            .map(|technology| format!("  - {}\n", technology))
            .collect::<String>();
        let semantic_tags = self
            .semantic_tags
            .iter()
            .map(|tag| format!("  - {}\n", tag))
            .collect::<String>();

        format!(
            "technologies:\n{}semantic_tags:\n{}",
            technologies, semantic_tags
        )
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProcessedDocMetadata {
    title: String,
    excerpt: String,
    summary: String,
    technologies: Vec<String>,
    semantic_tags: Vec<String>,
    source_filename: String,
    extraction_timestamp: String,
    document_type: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    markdown_bucket: String,
    markdown_object: String,
    analysis_model: String,
}

#[cfg(test)]
mod tests {
    use super::{
        fallback_title_from_filename, firestore_document_id, normalize_technologies,
        strip_code_fences,
    };

    #[test]
    fn sanitizes_firestore_document_ids() {
        assert_eq!(
            firestore_document_id("smoke-tests/demo.pdf.md"),
            "smoke-tests_demo.pdf.md"
        );
    }

    #[test]
    fn derives_readable_titles_from_pdf_names() {
        assert_eq!(
            fallback_title_from_filename("docs/Data_Structures-and_Algorithms.pdf"),
            "Data Structures and Algorithms"
        );
    }

    #[test]
    fn keeps_only_allowed_technologies() {
        assert_eq!(
            normalize_technologies(vec![
                "Java-6".to_string(),
                "PACBASE".to_string(),
                "legacy".to_string(),
            ]),
            vec!["java-6".to_string(), "pacbase".to_string()]
        );
    }

    #[test]
    fn strips_markdown_code_fences_from_json() {
        assert_eq!(
            strip_code_fences("```json\n{\"title\":\"Doc\"}\n```"),
            "{\"title\":\"Doc\"}"
        );
    }
}
