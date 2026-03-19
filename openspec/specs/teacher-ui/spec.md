# Teacher UI Specification

## Purpose
This specification defines the Teacher UI for the Rosetta application, providing a secure dashboard for teachers to upload and view documents.
## Requirements
### Requirement: Teacher Dashboard and Upload
1. The system MUST provide a secure SPA frontend for teachers.
2. The UI MUST use vanilla JS web components.

#### Scenario: Admin User Uploads File
- Given the user is authenticated and has the "admin" role
- When they drag and drop a raw document into the `<rw-uploader>` component
- Then the file is uploaded to the Firebase Storage `raw-docs-bucket`

#### Scenario: Reader User Views Dashboard
- Given the user is authenticated and has the "reader" role
- When they access the system
- Then the `<rw-uploader>` is hidden and they can only view `processed_docs` via `<rw-dashboard>`

### Requirement: Firebase Security Rules
1. The system MUST enforce RBAC at the Firebase infrastructure level.

#### Scenario: Client attempts unauthorized storage write
- Given a client without the "admin" role in `user_roles`
- When they attempt to write to `raw-docs-bucket`
- Then the storage rules DENY the request

### Requirement: Authenticated UI Falls Back To Reader During Role Bootstrap

The authenticated UI MUST default to the reader experience whenever the current user's `user_roles/{uid}` document is missing or cannot be fetched during onboarding. The UI MUST NOT expose admin-only upload controls until an explicit `admin` role is present.

#### Scenario: Newly authenticated user has no role document yet
- **WHEN** an authenticated user reaches the app before `user_roles/{uid}` exists
- **THEN** the UI renders the dashboard-only reader experience
- **AND** the upload surface remains hidden

#### Scenario: Role lookup fails during app bootstrap
- **WHEN** the app cannot read `user_roles/{uid}` for the current authenticated user
- **THEN** the UI falls back to the reader experience
- **AND** it does not grant admin-only capabilities by default

