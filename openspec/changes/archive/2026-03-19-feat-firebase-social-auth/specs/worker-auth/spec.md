# Auth Worker Specification

## ADDED Requirements

### Requirement: New User Role Assignment
1. The system MUST automatically assign the `reader` role to every newly registered Firebase Auth user.
2. Role assignment MUST be performed server-side by the `worker-auth` Cloud Run service, not by the client.
3. The worker MUST write a document `user_roles/{uid}` with `{ role: "reader", email: <user_email> }` to Firestore using Google Application Default Credentials.

#### Scenario: New user registers via social auth
- Given a user signs in for the first time via Google or GitHub
- When Firebase Auth creates a new user account
- Then the `worker-auth` service receives a `google.firebase.auth.user.v1.created` CloudEvent via Eventarc
- And it writes `user_roles/{uid} = { role: "reader", email: "<user_email>" }` to Firestore

#### Scenario: Client cannot write user_roles
- Given the existing Firestore security rules deny client writes to `user_roles`
- When any frontend client attempts to set its own role
- Then the write is rejected by Firestore rules

### Requirement: Admin Email Notification
1. The `worker-auth` service MUST send an email notification to the configured administrator when a new user registers.
2. The admin email address and transactional email API key MUST be provided via environment variables (`ADMIN_EMAIL`, `EMAIL_API_KEY`).

#### Scenario: Admin is notified of new user registration
- Given `ADMIN_EMAIL` and `EMAIL_API_KEY` are configured on the Cloud Run service
- When a new Firebase Auth user is created
- Then `worker-auth` sends an email to `ADMIN_EMAIL` notifying the admin of the new user's email address
