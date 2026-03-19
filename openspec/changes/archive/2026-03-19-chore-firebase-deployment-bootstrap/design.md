## Context

Rosetta already had archived changes for Rust worker deployment, frontend delivery, Firebase security rules, and Firebase CI/CD. Those changes correctly described the target architecture, but they stopped short of specifying several operational prerequisites that proved mandatory in production:

- the deploy workflow had to trigger on workflow-file changes and expose manual dispatch for recovery
- the Firebase CLI needed Workload Identity Federation plus an explicit quota project when using ADC
- the target GCP project had to be fully bootstrapped as a Firebase project with default Hosting and Storage resources
- the frontend build had to receive real Firebase Web App configuration rather than fall back to demo placeholders

This change is intentionally retrospective. It does not introduce a new runtime architecture; it makes the deployment contract explicit so future changes do not regress into an undocumented, partially working state.

## Goals / Non-Goals

**Goals:**

- Define a stable OpenSpec capability for Firebase deployment behavior that matches the production system as deployed on March 19, 2026
- Document the non-obvious requirements that gate a successful GitHub Actions to Firebase deployment
- Separate deployment concerns from the existing `teacher-ui` behavior spec so UI requirements and operational requirements do not drift together

**Non-Goals:**

- Redesign the application architecture or the Firebase product mix
- Split the current workflow into separate frontend and backend workflows
- Replace Workload Identity Federation with key-based credentials or `FIREBASE_TOKEN`

## Decisions

### 1. Introduce a separate `firebase-deployment` capability

Deployment behavior is cross-cutting infrastructure, not UI behavior. Keeping it in a dedicated capability avoids overloading `teacher-ui` with CI/CD and bootstrap details.

Alternative considered:
- Modify `teacher-ui` only. Rejected because deployment regressions would remain mixed with end-user behavior and harder to review independently.

### 2. Treat workflow self-triggering and manual dispatch as part of the deployment contract

The deploy workflow must be able to execute after its own definition changes; otherwise CI fixes can be merged without ever running. Manual dispatch is also required for operator recovery when no source change is needed.

Alternative considered:
- Rely on path filters for frontend files only. Rejected because it strands workflow-only fixes and slows recovery.

### 3. Standardize on WIF + ADC + explicit quota project for Firebase CLI

The deployed pipeline already uses Workload Identity Federation. The missing operational detail was that Firebase management APIs require quota-project-aware ADC usage. The contract therefore includes both WIF authentication and quota-project propagation, plus the IAM needed by the deployer service account.

Alternative considered:
- Reintroduce `FIREBASE_TOKEN` or long-lived service-account keys. Rejected because it weakens the security posture and duplicates existing GCP identity plumbing.

### 4. Make Firebase project bootstrap an explicit prerequisite

`firebase-tools deploy` assumes the target is more than a raw GCP project. The project must already be added to Firebase and provide the default Hosting site and default Firebase Storage bucket expected by the deploy flow.

Alternative considered:
- Leave bootstrap as tribal knowledge outside spec coverage. Rejected because first-deploy failures were a direct consequence of that omission.

### 5. Inject Web App configuration at build time from repository-managed values

The frontend source contains demo fallbacks for local safety. Production builds must override them with the target Firebase Web App configuration through repository-managed values so the published bundle points at the real project.

Alternative considered:
- Hardcode production config in source defaults. Rejected because it couples local development defaults to production and obscures deployment intent.

## Risks / Trade-offs

- [Risk] The spec can drift again if future Firebase environments are created ad hoc -> Mitigation: require new environments to satisfy the same bootstrap checklist and build-variable contract
- [Risk] Public Firebase Web App config stored as repository variables may be mistaken for secrets -> Mitigation: document that these are public client configuration values, not privileged credentials
- [Risk] The workflow still uses Node 20-based GitHub Actions versions -> Mitigation: track an upcoming maintenance change to move to Node 24-compatible action versions before the June 2, 2026 cutoff

## Migration Plan

1. Land this retrospective OpenSpec change to capture the deployed-state contract.
2. Review it against the current workflow and Firebase project setup.
3. Archive the change so the new `firebase-deployment` capability becomes part of the baseline specs.

Rollback:
- No runtime rollback is required because this change documents already-applied infrastructure and workflow behavior.

## Open Questions

- Should Rosetta keep a single Firebase deploy workflow, or split frontend/rules deployment from Rust worker deployment in a future cleanup change?
- Should the Node 20 deprecation warning be handled as a dedicated maintenance change or folded into a broader GitHub Actions upgrade effort?
