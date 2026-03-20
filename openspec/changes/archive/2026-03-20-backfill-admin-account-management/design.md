## Context

The current OpenSpec baseline captures the teacher dashboard, upload access control, and the backend onboarding relay into `worker-auth`, but it does not describe the shipped admin account review workflow. The live code now includes three spec-level behaviors that are missing from OpenSpec:

- authenticated users can switch `rw-auth` into an email/password account-creation mode
- admin users can open an account administration view that lists all Firebase Auth users and updates roles through privileged Firebase Functions
- onboarding emails sent by `worker-auth` include the new user's UID and a deep link to the admin review screen

This is a cross-cutting retrospective change touching frontend routing, privileged backend APIs, and onboarding notifications.

## Goals / Non-Goals

**Goals:**
- document the admin-only account administration workflow as a first-class OpenSpec capability
- capture the shipped requirement that new account creation is available from `rw-auth`
- update the onboarding notification contract so the admin email includes the UID-centric review context and direct navigation
- keep the spec model aligned with the deployed architecture: Firebase Auth trigger -> Firebase Function -> `worker-auth` -> admin review page

**Non-Goals:**
- redesign Firebase security rules for client-side reads and writes
- replace Firestore role storage with custom claims or another authorization model
- specify visual design details for the admin page beyond required behavior
- add archival steps for this change in the same turn

## Decisions

### 1. Add a separate `account-administration` capability

The account review page is broader than the existing teacher dashboard and upload flow, and it spans both UI and privileged backend APIs. Documenting it as its own capability keeps the existing `teacher-ui` capability focused on dashboard and upload behaviors while giving the admin review flow room for its own requirements.

Alternative considered:
- Extend `teacher-ui` with the new admin review requirements. Rejected because it would blend two distinct user journeys and make future changes harder to isolate.

### 2. Model account review through privileged Firebase Functions

Firestore rules intentionally allow users to read only their own `user_roles/{uid}` document. Because of that, any spec for listing all accounts or updating another user's role must run through a backend path that verifies the caller is an admin and then uses Firebase Admin SDK privileges.

Alternative considered:
- Loosen Firestore rules so admins can query `user_roles` directly from the client. Rejected because it weakens the current security model and still would not expose Firebase Auth account metadata.

### 3. Use query-parameter deep links for account selection

The shipped app encodes account selection as `?view=admin&uid=<uid>`. This choice fits the static Firebase Hosting setup without requiring additional SPA rewrite rules or a router framework, and it lets the onboarding email link directly to the selected account.

Alternative considered:
- Add a path-based route such as `/admin/<uid>`. Rejected because the current hosting configuration and lightweight app shell do not justify additional routing infrastructure for this retrospective documentation change.

### 4. Require UID-first onboarding emails with direct review links

The onboarding email now always includes the new user's UID and a direct review URL. Email addresses can be missing for some providers, but the UID is always available and is the stable identifier used by `user_roles` and admin actions.

Alternative considered:
- Keep email-only notifications. Rejected because they do not reliably identify the account to review and they force the admin to search manually.

### 5. Guard against self-demotion in the admin workflow

The shipped admin page and backend role update path prevent an admin from removing their own admin role from that view. This avoids accidental lockout from the only privileged review surface currently available in the app.

Alternative considered:
- Allow unrestricted self-demotion. Rejected because it can strand the active operator without access to the administration page.

## Risks / Trade-offs

- [Large Firebase Auth user sets can make account listing slower] -> Mitigation: document the current full-list behavior and accept pagination as a future enhancement rather than a hidden assumption.
- [Default deep links may target the `web.app` domain instead of a custom domain] -> Mitigation: the worker supports an explicit app base URL override; otherwise it falls back to the default Hosting domain.
- [Query-parameter routing is less expressive than a dedicated router] -> Mitigation: it keeps the app compatible with the current static hosting setup and is sufficient for one admin view plus selected account state.
- [Role changes are Firestore-backed rather than claim-backed] -> Mitigation: keep the contract explicit that the admin workflow updates `user_roles/{uid}`, which is already the source of truth for upload authorization.

## Migration Plan

1. Add this retrospective change with proposal, design, tasks, and delta specs.
2. Review the generated delta specs against the already shipped code paths in `frontend`, `functions`, and `worker-auth`.
3. When the change is archived, merge the new capability and requirement updates into the baseline specs.

Rollback is documentation-only: if the change is deemed inaccurate, delete or revise the change before archive.

## Open Questions

- Should a future spec capture pagination or filtering for large account sets, or is the current full-list contract sufficient?
- Should the deployed environment standardize `APP_BASE_URL` rather than relying on a `web.app` fallback?
