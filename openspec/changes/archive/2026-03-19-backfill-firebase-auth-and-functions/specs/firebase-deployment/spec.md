## ADDED Requirements

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
