## Why

The archived Firebase CI/CD changes from March 18, 2026 described the intended deployment flow, but they did not capture the operational requirements that actually made production deployment succeed. During live validation on March 19, 2026, we had to repair workflow triggering, ADC quota-project handling, Firebase project bootstrap, and frontend build-time Firebase configuration before the frontend could be published reliably.

## What Changes

- Add a dedicated `firebase-deployment` capability that documents the production contract for the Firebase Hosting and rules deployment pipeline.
- Capture the requirement that the GitHub Actions workflow triggers on deployment inputs, including workflow-definition changes, and supports manual recovery runs.
- Capture the requirement that `firebase-tools` deploys through Workload Identity Federation with quota-project-aware Application Default Credentials instead of a legacy `FIREBASE_TOKEN`.
- Capture the requirement that the target project is Firebase-enabled and already provisioned with a default Hosting site and default Firebase Storage bucket before first deploy.
- Capture the requirement that production frontend builds inject real Firebase Web App configuration instead of relying on demo fallback values.

## Capabilities

### New Capabilities

- `firebase-deployment`: Production deployment contract for the Firebase Hosting and rules pipeline, including CI triggers, auth, bootstrap resources, and build-time web configuration.

### Modified Capabilities

None.

## Impact

- `.github/workflows/deploy.yml`
- GitHub repository variables used during the Vite production build
- Firebase project bootstrap state for `rosetta-490508` (Firebase enablement, Hosting site, default Storage bucket, Web App config)
- OpenSpec baseline coverage for deployment behavior that was previously only implicit
