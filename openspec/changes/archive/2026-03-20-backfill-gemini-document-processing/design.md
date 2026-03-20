## Context

The current OpenSpec baseline captures the teacher dashboard, client-side role gating, Firebase deployment stages, and the auth/onboarding path, but it does not describe the shipped PDF ingestion architecture. The live system now relies on three cross-cutting behaviors that materially changed the contract:

- admin uploads no longer write raw files through the Firebase Storage SDK because the ingestion bucket is a plain GCS bucket watched by Eventarc rather than a Firebase-managed bucket
- `worker-pdf` now enriches processed PDFs through Vertex AI Gemini and writes both Markdown output and Firestore metadata for the dashboard
- the deployment workflow now builds and deploys the Rust document workers, and the runtime depends on explicit Vertex AI API and IAM prerequisites

This is a retrospective documentation change touching frontend upload behavior, backend processing contracts, and infrastructure requirements.

## Goals / Non-Goals

**Goals:**
- document PDF processing as a first-class OpenSpec capability rather than leaving it implicit in archived design notes only
- capture the shipped admin upload path as a callable-created resumable GCS session instead of a direct Firebase Storage write
- update the deployment contract so it reflects the Rust worker rollout and Vertex AI prerequisites already required in production
- keep the resulting specs aligned with the current code paths in `frontend`, `functions`, `worker-pdf`, and GitHub Actions

**Non-Goals:**
- redesign the PDF worker architecture or replace Gemini with another provider
- specify HTML and JAR enrichment behavior beyond what is already covered by the existing codebase and deployment workflow
- document every visual detail of the dashboard cards or upload animation
- archive this change in the same step

## Decisions

### 1. Add a dedicated `pdf-document-processing` capability

The shipped PDF pipeline spans Eventarc, Cloud Run, Vertex AI, Cloud Storage, and Firestore. Documenting it only inside `teacher-ui` or `firebase-deployment` would hide the actual processing contract behind UI or ops concerns. A dedicated capability keeps the PDF ingestion and metadata semantics explicit.

Alternative considered:
- Extend `teacher-ui` only. Rejected because it would mix user-facing upload behavior with backend document enrichment and storage contracts.

### 2. Model raw upload initiation as a privileged callable plus browser-owned resumable upload

The raw ingestion bucket is not a Firebase Storage bucket. The browser therefore cannot rely on `uploadBytesResumable` against the Firebase Storage SDK. The shipped system uses a callable Function to verify the caller and create a resumable GCS upload session, then lets the browser stream the file directly to GCS.

Alternative considered:
- Keep the old direct Firebase Storage upload contract. Rejected because it does not match the deployed bucket type and fails against the raw ingestion bucket.

### 3. Treat Firestore `processed_docs` metadata as the dashboard contract

The dashboard now depends on metadata written by the PDF worker, not just the existence of Markdown objects. The authoritative reader-facing fields are `title`, `excerpt`, `summary`, `technologies`, `semantic_tags`, `createdAt`, and deterministic source fields such as `source_filename` and `document_type`.

Alternative considered:
- Infer everything from Markdown filenames in the UI. Rejected because the current dashboard already consumes `processed_docs`, and semantic summaries must be queryable without reparsing bucket objects on the client.

### 4. Capture Vertex AI prerequisites under `firebase-deployment`

The deployment contract is no longer limited to Hosting, rules, Functions, and `worker-auth`. The shipped pipeline requires the Rust worker deployment stage, `worker-pdf` runtime environment values for Vertex, `aiplatform.googleapis.com` enablement, `roles/aiplatform.user` on the deployer service account, and `storage.objectViewer` on the raw-docs bucket for the Vertex AI service agent.

Alternative considered:
- Keep Vertex prerequisites implicit and document only the workflow YAML. Rejected because the worker can deploy successfully while remaining non-functional at runtime if these project-level prerequisites are missing.

## Risks / Trade-offs

- [Gemini analysis adds long-running requests to PDF processing] -> Mitigation: document that Eventarc/Cloud Run processing for PDFs is asynchronous and can take on the order of minutes for large manuals.
- [At-least-once event delivery can replay a long-running PDF event] -> Mitigation: keep Firestore writes idempotent and treat duplicate model calls as a known trade-off until a stronger processing lock is specified.
- [The dashboard must tolerate legacy records without summary fields] -> Mitigation: document fallback behavior in `teacher-ui` rather than assuming every historical `processed_docs` record is fully enriched.
- [Project-level Vertex IAM can drift outside the repository] -> Mitigation: encode the prerequisite explicitly in `firebase-deployment` so missing runtime access is treated as a deployment misconfiguration.

## Migration Plan

1. Create this retrospective change with proposal, design, tasks, and delta specs for `pdf-document-processing`, `teacher-ui`, and `firebase-deployment`.
2. Review the new delta specs against the shipped code paths in `functions/index.js`, the frontend upload/dashboard components, `worker-pdf`, and `.github/workflows/deploy.yml`.
3. Archive the change so the new capability and modified requirements are merged into the baseline specs.

Rollback is documentation-only: revise or delete the change before archive if a requirement overstates the shipped behavior.

## Open Questions

- Should a future change document HTML and JAR semantic enrichment as separate capabilities, or keep this retrospective scope limited to the PDF path that now uses Gemini?
- Should the PDF worker gain an explicit processing lock to avoid duplicate Gemini calls during Eventarc redelivery?
