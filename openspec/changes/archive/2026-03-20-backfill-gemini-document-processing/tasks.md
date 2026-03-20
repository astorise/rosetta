## 1. Retrospective Review

- [x] 1.1 Verify the shipped admin upload flow matches the documented callable-created resumable GCS upload session contract in `functions/index.js` and `frontend/src/components/rw-uploader.js`.
- [x] 1.2 Verify the shipped PDF worker matches the documented Gemini enrichment contract in `rust-workers/worker-pdf/src/main.rs`, including Markdown output and `processed_docs` metadata fields.
- [x] 1.3 Verify the deployment workflow and GCP runtime prerequisites match the documented `firebase-deployment` delta requirements in `.github/workflows/deploy.yml` and the current project IAM/API configuration.

## 2. Specification Integration

- [x] 2.1 Merge the new `pdf-document-processing` capability into the baseline specs when this change is archived.
- [x] 2.2 Merge the `teacher-ui` and `firebase-deployment` delta specs into the baseline specs when this change is archived.
