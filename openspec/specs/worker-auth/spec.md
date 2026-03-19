# worker-auth Specification

## Purpose
This specification defines the backend onboarding flow that assigns default access and notifies administrators when new Firebase Auth users are created.
## Requirements
### Requirement: New User Onboarding Is Relayed To Worker-Auth

The system MUST react to newly created Firebase Auth users by invoking a Firebase Auth `onCreate` Function, and that Function MUST call the `worker-auth` Cloud Run service with the new user's onboarding data.

#### Scenario: New user creation invokes onboarding backend
- **WHEN** Firebase Auth creates a new user account
- **THEN** the Firebase Auth trigger function runs
- **AND** it invokes the `worker-auth` Cloud Run service with the new user's UID and email address

### Requirement: Worker-Auth Assigns The Default Reader Role Server-Side

The `worker-auth` service MUST create the default `reader` role for newly onboarded users on the server side. The client MUST NOT be responsible for writing `user_roles/{uid}`.

#### Scenario: Worker-auth writes the default role
- **WHEN** `worker-auth` receives an onboarding request for a new Firebase Auth user
- **THEN** it writes `user_roles/{uid}` with the role `reader`

#### Scenario: Frontend cannot self-assign roles
- **WHEN** a frontend client attempts to grant itself an onboarding role directly
- **THEN** the system rejects the client-side write path
- **AND** role assignment remains a backend-only responsibility

### Requirement: Worker-Auth Notifies The Administrator Of New Registrations

The `worker-auth` service MUST send an onboarding notification email to the configured administrator when a new Firebase Auth user is processed. The service MUST receive `ADMIN_EMAIL`, `EMAIL_API_KEY`, and `EMAIL_API_URL` through runtime environment configuration.

#### Scenario: Admin email is sent for a new user
- **WHEN** `worker-auth` processes a newly created Firebase Auth user
- **THEN** it sends an email notification to `ADMIN_EMAIL`
- **AND** the notification identifies the registering user's email address

#### Scenario: Email configuration is missing
- **WHEN** `worker-auth` starts without one of `ADMIN_EMAIL`, `EMAIL_API_KEY`, or `EMAIL_API_URL`
- **THEN** the service configuration is invalid
- **AND** the deployment MUST be treated as incomplete until those variables are provided
