## Why

The shipped Rosetta system now uploads raw documents through a callable backend path, enriches processed PDFs with Gemini-generated metadata, and deploys the document workers through the main GitHub Actions pipeline. The current OpenSpec baseline does not describe these behaviors and still models the teacher upload flow as a direct Firebase Storage upload without semantic analysis.

## What Changes

- Add a retrospective capability for PDF document processing that captures Eventarc-driven ingestion, Gemini/Vertex enrichment, Markdown generation, and Firestore metadata publication.
- Update the `teacher-ui` capability so the upload contract matches the callable upload-session flow and the dashboard contract includes processed document summaries and metadata cards.
- Update the `firebase-deployment` capability so the deployment contract includes building and deploying the Rust document workers and provisioning the Vertex AI runtime prerequisites they require.

## Capabilities

### New Capabilities
- `pdf-document-processing`: Event-driven PDF ingestion that produces Markdown plus Gemini-enriched metadata for `processed_docs`.

### Modified Capabilities
- `teacher-ui`: The admin upload flow now uses a callable backend to create a resumable raw-docs upload session, and the dashboard consumes enriched processed document metadata.
- `firebase-deployment`: The deployment workflow now covers the Rust document workers and the GCP prerequisites needed for Vertex-backed PDF analysis.

## Impact

- Affected frontend components: `frontend/src/components/rw-uploader.js`, `frontend/src/components/rw-dashboard.js`, and `frontend/src/lib/firebase.js`
- Affected backend/API surface: `functions/index.js` callable upload-session endpoint
- Affected workers and shared libraries: `rust-workers/worker-pdf/src/main.rs`, `rust-workers/shared-gcp/src/firestore.rs`, and `rust-workers/shared-gcp/src/yaml.rs`
- Affected deployment/runtime behavior: `.github/workflows/deploy.yml`, Cloud Run `worker-pdf` runtime configuration, Vertex AI API enablement, and raw-docs bucket IAM for the Vertex service agent
