## ADDED Requirements

### Requirement: Authentication UI Supports Email Account Creation
The `rw-auth` component MUST provide an in-component mode switch that allows a visitor to create an email/password account in addition to signing in.

#### Scenario: User creates an account with email and password
- **WHEN** a visitor switches `rw-auth` into account creation mode and submits valid email/password credentials
- **THEN** the component creates a Firebase Auth user with those credentials
- **AND** the new account enters the standard onboarding flow

### Requirement: Authentication UI Explains New Account Onboarding
The `rw-auth` component MUST explain that newly created accounts start with read-only access and require administrator review before write access is granted.

#### Scenario: User views account creation mode
- **WHEN** a visitor opens the account creation mode in `rw-auth`
- **THEN** the component displays onboarding guidance about the default read-only role
- **AND** the guidance states that an administrator reviews write access
