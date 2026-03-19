## ADDED Requirements

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
