# Implementation Tasks

## Phase 1: Rust Workspace & Shared Logic
- [x] Initialize Cargo workspace with 3 binaries (`worker-pdf`, `worker-html`, `worker-jar`) and 1 shared library (`shared-gcp`).
- [x] Implement `axum` server routing for POST `/` in the shared library.
- [x] Implement CloudEvent JSON deserialization.
- [x] Implement Firebase Storage upload/download helpers and Firestore metadata insertion.
- [x] Implement the YAML Frontmatter merging logic using `serde_yaml` (combine deterministic tags from Rust with semantic tags parsed from the LLM response).

## Phase 2: Worker Implementation
- [x] **worker-pdf**: Implement PDF text extraction and chunking logic.
- [x] **worker-html**: Implement `async_zip` stream reading, `scraper` HTML cleanup, and the `tokio::sync::Semaphore` concurrency logic.
- [x] **worker-jar**: Implement JAR download to `/tmp` and subprocess call to `cfr.jar`. Add the semantic flattening LLM instruction.

## Phase 3: Dockerization
- [x] Create `Dockerfile.pdf` using a multi-stage build (Debian slim for final stage).
- [x] Create `Dockerfile.html` using a multi-stage build (Debian slim for final stage).
- [x] Create `Dockerfile.jar` using a multi-stage build (MUST install `default-jre-headless` in the final Debian stage to run `cfr.jar`).

## Phase 4: CI/CD & Deployment
- [x] Create `.github/workflows/deploy.yml`.
- [x] Add `google-github-actions/auth` step using Workload Identity Federation.
- [x] Add Docker build and push steps to Google Artifact Registry for all 3 images.
- [x] Add `gcloud run deploy` steps for the 3 services.
- [x] Add `gcloud eventarc triggers create` steps with the correct path pattern filters (`*.pdf`, `*.zip`, `*.jar`).