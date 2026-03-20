## Why

The shipped system now includes an admin-facing account review page, role management actions, and onboarding emails that deep-link directly to the relevant user record. The current OpenSpec baseline does not describe this workflow, and it also still models `rw-auth` as sign-in only even though the UI now supports account creation.

## What Changes

- Add a retrospective capability for admin account administration, including a full account list, URL-driven account selection, and admin-only role updates.
- Update `worker-auth` to document that onboarding emails always include the user's UID and a deep link to the admin review page.
- Update `rw-auth` to document the in-component account creation mode and its onboarding guidance for newly registered users.

## Capabilities

### New Capabilities
- `account-administration`: Admin-only account review and role management UI backed by privileged Firebase Functions.

### Modified Capabilities
- `rw-auth`: The authentication entry point now supports account creation in addition to sign-in and social providers.
- `worker-auth`: Onboarding notifications now include the UID-centric review context and a direct link to the admin account page.

## Impact

- Affected frontend components: `frontend/src/components/rw-app.js`, `frontend/src/components/rw-auth.js`, `frontend/src/components/rw-admin.js`, `frontend/src/main.js`, and `frontend/src/lib/firebase.js`
- Affected backend/API surface: `functions/index.js` callable Functions for admin account listing and role updates
- Affected onboarding worker: `rust-workers/worker-auth/src/main.rs` and `rust-workers/worker-auth/Cargo.toml`
- Affected runtime behavior: admin onboarding emails, authenticated app routing, and account access management flows
