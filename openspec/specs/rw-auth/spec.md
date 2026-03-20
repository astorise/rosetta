# rw-auth Specification

## Purpose
This specification defines the Rosetta authentication entry UI, including credential-based sign-in and popup-based social authentication providers.
## Requirements
### Requirement: Authentication UI Supports Email And Social Providers

The `rw-auth` component MUST support sign-in with email/password credentials and popup-based social sign-in through Google and GitHub using Firebase Authentication.

#### Scenario: User signs in with email and password
- **WHEN** a user submits valid email/password credentials in `rw-auth`
- **THEN** the component signs the user in with Firebase Authentication

#### Scenario: User signs in with Google
- **WHEN** a user clicks the Google sign-in button in `rw-auth`
- **THEN** the component starts a Firebase popup flow with `GoogleAuthProvider`

#### Scenario: User signs in with GitHub
- **WHEN** a user clicks the GitHub sign-in button in `rw-auth`
- **THEN** the component starts a Firebase popup flow with `GithubAuthProvider`

### Requirement: Authentication Errors Stay In Component Context

The `rw-auth` component MUST surface authentication failures inside the component and restore the relevant button state after a failed sign-in attempt.

#### Scenario: Email/password sign-in fails
- **WHEN** Firebase Authentication rejects an email/password sign-in attempt
- **THEN** `rw-auth` displays the error message inside the component
- **AND** re-enables the submit button

#### Scenario: Social popup sign-in fails
- **WHEN** Firebase Authentication rejects a Google or GitHub popup sign-in attempt
- **THEN** `rw-auth` displays the error message inside the component
- **AND** restores the clicked provider button to its normal state

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

