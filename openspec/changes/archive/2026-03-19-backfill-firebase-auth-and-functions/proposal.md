## Why

The OpenSpec baseline still misses part of the Firebase Auth onboarding system that is already implemented, and the `firebase-deployment` spec stops short of the production contract that now includes Cloud Functions deployment. As a result, the repository-level specs no longer describe the system that actually shipped and was validated in GitHub Actions on March 19, 2026.

## What Changes

- Add a baseline capability for the `rw-auth` component that documents email/password plus Google and GitHub popup sign-in behavior.
- Add a baseline capability for the `worker-auth` onboarding pipeline that documents server-side default role assignment and admin notification for newly created Firebase Auth users.
- Update the `firebase-deployment` capability to cover the Functions deployment stage, including supported Node runtime, parameterized runtime configuration, deployment ordering, and the GCP IAM/API prerequisites discovered during production rollout.
- Update the `teacher-ui` capability so the authenticated app contract includes the safe reader fallback used while role bootstrap is still in progress.
- Correct the documented onboarding architecture so it matches the deployed system: Firebase Auth user creation triggers a Firebase Function, which then invokes the `worker-auth` Cloud Run service.

## Capabilities

### New Capabilities
- `rw-auth`: Authentication UI behavior for email/password and social sign-in providers.
- `worker-auth`: Backend onboarding flow that assigns a default role and notifies the administrator for new Firebase Auth users.

### Modified Capabilities
- `firebase-deployment`: Extend the deployment contract to include Firebase Functions runtime, configuration, IAM, API enablement, and job sequencing with the Cloud Run onboarding worker.
- `teacher-ui`: Document the authenticated reader fallback when role data is missing or temporarily unreadable during onboarding.

## Impact

- `frontend/src/components/rw-auth.js`
- `frontend/src/components/rw-app.js`
- `functions/index.js`
- `functions/package.json`
- `rust-workers/worker-auth/src/main.rs`
- `.github/workflows/deploy.yml`
- `firebase.json`
- GCP service-account IAM bindings and enabled APIs required by the Functions deployment path
- OpenSpec baseline coverage for authentication onboarding and Firebase Functions delivery
