## Context

Rosetta's March 19, 2026 delivery left the OpenSpec baseline in a partially stale state:

- the active baseline documented Firebase Hosting and rules deployment, but not the later Functions deployment stage that now gates the onboarding backend
- the archived social-auth change described a direct Eventarc-to-Cloud-Run path that is not the deployed architecture
- the baseline still lacked first-class capabilities for `rw-auth` and `worker-auth`, even though both are now part of the shipped system

The deployed implementation is now validated end-to-end in GitHub Actions:

- `worker-auth` is deployed to Cloud Run first
- the deploy workflow writes `functions/.env.<project_ID>` with `CLOUD_RUN_SERVICE_URL`
- Firebase Functions are deployed afterward on `nodejs22`
- the onboarding path starts with a Firebase Auth `onCreate` Function and relays to `worker-auth`

This change is retrospective documentation only. It aligns OpenSpec with the system that already exists in code and in production configuration.

## Goals / Non-Goals

**Goals:**

- Bring the OpenSpec baseline back in sync with the deployed Firebase onboarding and deployment architecture
- Add stable capabilities for `rw-auth` and `worker-auth`
- Extend `firebase-deployment` so it captures the Functions stage, parameterized runtime configuration, and discovered IAM/API prerequisites
- Capture the authenticated UI fallback to the reader experience while backend role assignment is still completing

**Non-Goals:**

- Redesign the onboarding backend
- Replace the current Cloud Function to Cloud Run relay with a different eventing model
- Refactor the existing frontend architecture or Rust worker internals
- Re-open the already archived March 19 changes in place

## Decisions

### 1. Create a new backfill change instead of editing archived changes in place

Archived changes are historical records of prior planning state, including assumptions that later proved wrong. A fresh backfill change preserves that history while making the current contract explicit.

Alternative considered:
- Edit the archived March 19 change directly. Rejected because it would erase what was originally planned and make the archive less trustworthy as history.

### 2. Model `rw-auth` and `worker-auth` as separate capabilities

The authentication UI and the backend onboarding worker change for different reasons and live in different parts of the codebase. Separate capabilities keep frontend sign-in behavior, backend onboarding responsibilities, and deploy infrastructure reviewable on their own.

Alternative considered:
- Fold everything into `teacher-ui` or `firebase-deployment`. Rejected because it would mix user-facing auth behavior with backend automation and infrastructure concerns.

### 3. Document the actual onboarding relay: Firebase Auth trigger function to Cloud Run

The archived social-auth design assumed a direct Eventarc trigger to `worker-auth`. The deployed system now uses a Firebase Auth `onCreate` Function that calls `worker-auth` after the worker URL has been published. The spec should describe that relay because it is the architecture the workflow now provisions.

Alternative considered:
- Keep the older Eventarc wording and treat the relay as implementation detail. Rejected because the old wording is now factually wrong and was already shown to be unsupported.

### 4. Extend `firebase-deployment` with Functions runtime and prerequisite contracts

The Functions deployment path introduced requirements that were not visible in the earlier deployment spec: a supported Node runtime, explicit `firebase-functions` and `firebase-admin` dependencies, project-specific `.env.<project_ID>` runtime parameters, and GCP IAM/API prerequisites needed for Cloud Functions creation.

Alternative considered:
- Treat these as CI-only details outside spec coverage. Rejected because these details directly determine whether production deployment succeeds.

### 5. Capture reader fallback under `teacher-ui`

The authenticated app shell, not `rw-auth`, decides what to render while role data is loading. Documenting the fallback under `teacher-ui` keeps the requirement attached to the component that actually controls access to admin-only UI.

Alternative considered:
- Keep the fallback requirement under `rw-auth` as in the archived draft. Rejected because the current code implements this behavior in `rw-app`.

## Risks / Trade-offs

- [Risk] Future onboarding redesign could move away from the Function relay and make this backfill stale. -> Mitigation: treat future architecture shifts as new OpenSpec changes instead of silently editing baseline specs.
- [Risk] Runtime support windows will continue to move. -> Mitigation: express the contract around supported runtime selection and explicit dependency ownership, then update the spec again when the runtime target changes.
- [Risk] Some GCP prerequisites are operational rather than code-local. -> Mitigation: document them explicitly in `firebase-deployment` so rollout blockers are visible during review.

## Migration Plan

1. Create this retrospective change and capture delta specs for `firebase-deployment`, `teacher-ui`, `rw-auth`, and `worker-auth`.
2. Archive the change so the new and updated capabilities are synced into `openspec/specs/`.
3. Keep the archived March 19 changes as historical planning records.

Rollback:
- No runtime rollback is required because this change only updates OpenSpec artifacts.
- If any delta is judged too opinionated, archive can be deferred and the change can remain as an active draft for refinement.

## Open Questions

- Should a later maintenance change move the onboarding flow to Firebase Functions v2 / Eventarc-native identity triggers if Firebase support becomes clearer?
- Should the default-role payload stored in Firestore eventually include the user's email address, or remain limited to role data only?
