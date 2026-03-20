## MODIFIED Requirements

### Requirement: Worker-Auth Notifies The Administrator Of New Registrations
The `worker-auth` service MUST send an onboarding notification email to the configured administrator when a new Firebase Auth user is processed. The service MUST receive `ADMIN_EMAIL`, `EMAIL_API_KEY`, and `EMAIL_API_URL` through runtime environment configuration. The notification MUST always identify the new user's UID and MUST include a direct review URL to the admin account administration view. If the user's email address is known, the notification MUST include it; otherwise the email MUST still be sent with the UID and review URL.

#### Scenario: Admin email is sent for a new user
- **WHEN** `worker-auth` processes a newly created Firebase Auth user
- **THEN** it sends an email notification to `ADMIN_EMAIL`
- **AND** the notification identifies the new user's UID
- **AND** the notification includes a direct review URL to the admin account administration view

#### Scenario: New user email address is missing
- **WHEN** `worker-auth` processes a newly created Firebase Auth user without an email address
- **THEN** it still sends an email notification to `ADMIN_EMAIL`
- **AND** the notification identifies the new user's UID
- **AND** the notification includes a direct review URL to the admin account administration view

#### Scenario: Email configuration is missing
- **WHEN** `worker-auth` starts without one of `ADMIN_EMAIL`, `EMAIL_API_KEY`, or `EMAIL_API_URL`
- **THEN** the service configuration is invalid
- **AND** the deployment MUST be treated as incomplete until those variables are provided
