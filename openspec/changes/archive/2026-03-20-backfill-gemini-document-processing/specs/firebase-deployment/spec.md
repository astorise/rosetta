## ADDED Requirements

### Requirement: Deploy workflow rolls out Rust document workers

The main deployment workflow MUST build, push, and deploy the Rust document workers after the frontend deployment stage and before the Functions deployment stage.

#### Scenario: Rust worker sources change on main
- **WHEN** a commit on `main` changes `rust-workers/**` or `.github/workflows/deploy.yml`
- **THEN** the deployment workflow runs the Rust workspace tests
- **AND** it deploys `worker-pdf`, `worker-html`, and `worker-jar` to Cloud Run before deploying Firebase Functions

### Requirement: PDF worker deployment includes Vertex runtime configuration

The deployment workflow MUST configure `worker-pdf` with the runtime settings required for Vertex-backed PDF analysis.

#### Scenario: worker-pdf is deployed for PDF analysis
- **WHEN** the workflow deploys `worker-pdf`
- **THEN** it provides `PROJECT_ID`, `MD_BUCKET`, `VERTEX_LOCATION`, and `GEMINI_MODEL` as Cloud Run environment variables

### Requirement: Vertex-backed PDF analysis requires explicit project prerequisites

The deployment MUST treat Vertex-backed PDF analysis as dependent on explicit GCP API enablement and IAM grants outside the repository contents.

#### Scenario: Project is prepared for Gemini PDF analysis
- **WHEN** the target project is configured for `worker-pdf` Gemini analysis
- **THEN** `aiplatform.googleapis.com` is enabled
- **AND** the deployer service account has `roles/aiplatform.user`
- **AND** the Vertex AI service agent can read the raw-docs bucket objects needed for PDF analysis
