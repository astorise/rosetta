# firebase-deployment Specification

## Purpose
This specification defines the production deployment contract for Rosetta's Firebase Hosting and rules pipeline, including workflow triggering, authentication, project bootstrap prerequisites, and production frontend configuration.
## Requirements
### Requirement: Deploy Workflow Trigger Coverage

The system MUST start the Firebase deployment workflow when deployment inputs change, including frontend sources, Firebase rules and configuration, and the workflow definition itself. The system MUST also allow maintainers to invoke the same deployment flow manually.

#### Scenario: Workflow definition changes
- **WHEN** a commit on `main` changes `.github/workflows/deploy.yml`
- **THEN** GitHub Actions starts a new Firebase deployment run for that commit

#### Scenario: Manual redeploy
- **WHEN** maintainers need to rerun the Firebase deployment without changing application files
- **THEN** the workflow can be invoked through `workflow_dispatch`

### Requirement: Firebase CLI Deployment Uses WIF With Quota-Aware ADC

The system MUST authenticate Firebase deployments from GitHub Actions with Workload Identity Federation and Application Default Credentials. The deployment step MUST provide the target quota project, and the deployer service account MUST have the Firebase and Service Usage permissions required for `firebase-tools` to resolve and deploy the target project without a legacy `FIREBASE_TOKEN`.

#### Scenario: GitHub Actions deploy resolves the Firebase project
- **WHEN** the workflow runs `firebase-tools deploy` after WIF authentication
- **THEN** the deployment resolves the target Firebase project and can publish Hosting, Firestore rules, and Storage rules using ADC

#### Scenario: Missing deployment IAM
- **WHEN** the deployer service account lacks Firebase deployment permissions or Service Usage Consumer access on the target project
- **THEN** the deployment is considered misconfigured and MUST be blocked until those roles are granted

### Requirement: Target Firebase Project Is Bootstrapped Before First Deploy

The system MUST target a Firebase-enabled project that already provides a default Hosting site and a default Firebase Storage bucket before Hosting or Storage rules are deployed.

#### Scenario: First deployment to a fresh project
- **WHEN** a new target project is prepared for Firebase deployment
- **THEN** Firebase is added to the project and the default Hosting and Storage resources are provisioned before the workflow publishes

#### Scenario: Missing default Hosting or Storage resources
- **WHEN** the deploy workflow targets a project without a default Hosting site or default Firebase Storage bucket
- **THEN** the deployment MUST NOT be considered production-ready

### Requirement: Production Frontend Build Uses Target Web App Configuration

The system MUST inject the target Firebase Web App configuration into the Vite production build using repository-managed values for `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`. Production builds MUST NOT rely on demo fallback values.

#### Scenario: Production bundle generation
- **WHEN** GitHub Actions builds the frontend for deployment
- **THEN** the generated bundle initializes Firebase with the target project configuration instead of demo fallback values

#### Scenario: Published bundle targets the deployed project
- **WHEN** the deployed frontend bundle is inspected after publication
- **THEN** it references the Firebase project, auth domain, storage bucket, and app ID of the deployed environment

### Requirement: Functions Deployment Uses Supported Runtime and Runtime Parameters

The system MUST deploy Firebase Functions from a dedicated workflow stage after the `worker-auth` Cloud Run service has been deployed. The Functions deployment MUST target the supported `nodejs22` runtime, and the workflow MUST provide runtime configuration through a project-specific `.env.<project_ID>` file before `firebase-tools deploy --only functions`.

#### Scenario: Worker URL is propagated to Functions runtime configuration
- **WHEN** the deployment workflow finishes deploying `worker-auth`
- **THEN** it resolves the deployed Cloud Run service URL
- **AND** writes `CLOUD_RUN_SERVICE_URL` to `functions/.env.<project_ID>` before the Functions deploy step runs

#### Scenario: Functions package declares its Firebase SDK runtime dependencies explicitly
- **WHEN** the Functions package is installed for deployment
- **THEN** it declares `firebase-functions` and `firebase-admin` directly in `functions/package.json`
- **AND** the deployment targets the `nodejs22` runtime rather than a deprecated Node major

### Requirement: Functions Deployment Prerequisites Are Provisioned In GCP

The system MUST treat Firebase Functions deployment as dependent on explicit GCP API enablement and service-account impersonation grants. The target project MUST enable `cloudfunctions.googleapis.com`, `cloudbuild.googleapis.com`, `cloudbilling.googleapis.com`, and `firebaseextensions.googleapis.com`, and the GitHub deployer service account MUST be allowed to act as both the App Engine default service account and the default Compute Engine service account used during function creation.

#### Scenario: Missing Functions API prerequisite blocks deployment
- **WHEN** the target project lacks one of the required Cloud Functions deployment APIs
- **THEN** the deployment is considered misconfigured
- **AND** the missing API MUST be enabled before the Functions stage is treated as healthy

#### Scenario: Missing service-account impersonation blocks function creation
- **WHEN** the deployer service account lacks `iam.serviceAccounts.actAs` on either the App Engine default service account or the default Compute Engine service account
- **THEN** Firebase Functions creation fails
- **AND** the deployment MUST be treated as blocked until the impersonation grant is added

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

### Requirement: Rust document worker deployments preserve dual-routing storage access

The deployment workflow MUST provision the runtime identity used by `worker-pdf`, `worker-html`, and `worker-jar` with the storage permissions required to create and update the dual-routing artifacts in the markdown bucket.

#### Scenario: Dual-routing workers are deployed
- **WHEN** the deployment provisions the runtime identity for the Rust document workers
- **THEN** that identity retains `roles/storage.objectAdmin` on `gs://<PROJECT_ID>-rag-markdown-bucket`
- **AND** the workers can create or update LanceDB objects under `vectordb`
- **AND** the workers can create or update the shared `rl_dataset.jsonl` object

