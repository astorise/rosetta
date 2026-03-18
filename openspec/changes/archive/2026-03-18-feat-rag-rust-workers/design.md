# System Design: Rust Workers, Tagging Strategy & CI/CD Pipeline

## 1. Global Architecture
- **Language**: Rust (Edition 2021) in a Cargo workspace.
- **Framework**: `axum` (port 8080) handling `CloudEvents` from Eventarc.
- **State & Storage**: 
  - Raw files in Firebase Storage `raw-docs-bucket`.
  - Processed Markdown in `rag-markdown-bucket`.
  - Audit metadata in Firestore collection `processed_docs`.
- **Pattern**: Teacher/Student. High-end LLM API prepares data for lightweight local LLMs on k3s.

## 2. Markdown Tagging Strategy (YAML Frontmatter)
All generated `.md` files MUST start with a YAML Frontmatter block to enable Metadata Filtering in the k3s Vector Database.


**Responsibility Split & Merging Logic (`serde_yaml`):**
1. **The Teacher LLM (Semantic Tags):** The LLM prompt must strictly require identifying technologies and concepts, outputting a YAML block. Allowed technologies enum: `[java-6, pacbase, tapestry-5.4, maven-3, unknown]`.
2. **The Rust Worker (Deterministic Tags):** Extracts source filename, extraction timestamp, and document type (`jar/pdf/html`).
3. **Merge**: The Rust worker parses the LLM's YAML frontmatter, merges it with its own deterministic tags, and writes the final prefixed Markdown to `MD_BUCKET`.

## 3. Worker Specifications

### A. worker-pdf (Manuals Extractor)
- **Target**: `*.pdf` (e.g., Pacbase manuals).
- **Logic**: Use `pdf-extract`. Chunk text (~15 pages).
- **Teacher Prompt**: *"Format this legacy technical manual text into clean Markdown. Preserve tables and explain obscure Pacbase/legacy jargon. Generate a YAML frontmatter with `technologies` and `semantic_tags`."*

### B. worker-html (ZIP Streamer)
- **Target**: `*.zip` (e.g., Javadocs, Tapestry HTML).
- **Logic**: Use `async_zip` to stream without loading the full file in RAM. Filter for `.html`/`.htm`. Use `scraper` to strip `<script>`, `<style>`, `<nav>`.
- **Constraint**: Wrap LLM HTTP calls in `tokio::sync::Semaphore(10)` to prevent API Rate Limits (HTTP 429).
- **Teacher Prompt**: *"Convert this HTML doc to Markdown. Remove navigation noise. Preserve class/method structure. Generate a YAML frontmatter with `technologies` and `semantic_tags`."*

### C. worker-jar (Decompiler & Semantic Flattener)
- **Target**: `*.jar` (e.g., Open-source libraries).
- **Logic**: Download to `/tmp`. Execute headless JRE with `cfr.jar` decompiler via `std::process::Command`.
- **Teacher Prompt**: *"You are a Java 6 system engineer. Describe the business utility of this decompiled class. Perform SEMANTIC FLATTENING: reduce the internal call tree strictly to native Java 6 APIs (java.util, java.io). Generate a YAML frontmatter with `technologies` and `semantic_tags`."*

## 4. Infrastructure & CI/CD (GitHub Actions)
- **Authentication**: GCP Workload Identity Federation (OIDC) to securely authenticate GitHub Actions.
- **Container Registry**: Google Artifact Registry.
- **Workflow (`deploy.yml`)**: Checkout -> Setup Rust cache -> `cargo test` -> GCP Auth via OIDC -> Build multi-stage Docker images -> Push to Artifact Registry -> `gcloud run deploy` -> `gcloud eventarc triggers create`.