# Teacher UI Specification

## ADDED Requirements

### Requirement: Firebase Security Rules
1. The system MUST enforce RBAC at the Firebase infrastructure level.

#### Scenario: Client attempts unauthorized storage write
- Given a client without the "admin" role in `user_roles`
- When they attempt to write to `raw-docs-bucket`
- Then the storage rules DENY the request
