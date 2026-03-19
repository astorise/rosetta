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
