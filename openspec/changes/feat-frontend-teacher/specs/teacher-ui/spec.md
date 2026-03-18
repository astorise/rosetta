# Teacher UI Specification

## ADDED Requirements

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
