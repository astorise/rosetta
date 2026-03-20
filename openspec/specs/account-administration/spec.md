# account-administration Specification

## Purpose
TBD - created by archiving change backfill-admin-account-management. Update Purpose after archive.
## Requirements
### Requirement: Admins Can Review All Accounts
The system MUST provide an account administration view for admin users that lists Firebase Auth accounts together with their current application role.

#### Scenario: Admin loads the account administration view
- **WHEN** an authenticated user with the `admin` role opens the account administration view
- **THEN** the system lists all Firebase Auth accounts
- **AND** each account entry includes its current role in `user_roles`

### Requirement: Account Administration Selection Is URL-Driven
The account administration view MUST synchronize the selected account with the `uid` query parameter in the URL.

#### Scenario: Admin opens a deep link to a specific account
- **WHEN** an admin opens the app with `?view=admin&uid=<target_uid>`
- **THEN** the account administration view loads
- **AND** the account whose UID matches `<target_uid>` is selected in the detail panel

#### Scenario: Admin opens the account administration view without a selected UID
- **WHEN** an admin opens the app with `?view=admin` and no `uid` query parameter
- **THEN** the account administration view selects a default account
- **AND** the app writes the selected account UID back into the URL

### Requirement: Account Administration Is Restricted To Admins
The system MUST restrict account review and account role mutation to users whose `user_roles/{uid}` document contains the role `admin`.

#### Scenario: Reader attempts to access admin account APIs
- **WHEN** an authenticated user without the `admin` role calls the account listing or role update backend
- **THEN** the request is rejected
- **AND** no account data or role change is returned

### Requirement: Admins Can Change Account Roles
The system MUST allow admins to change a selected account between `reader` and `admin` through a privileged backend path that updates `user_roles/{uid}`.

#### Scenario: Admin grants write access to a reader account
- **WHEN** an admin changes a selected account role from `reader` to `admin`
- **THEN** the privileged backend updates `user_roles/{uid}` to `admin`
- **AND** the account administration view reflects the updated role

#### Scenario: Admin attempts to remove their own admin access
- **WHEN** an admin changes their own selected account role from `admin` to `reader` through the account administration workflow
- **THEN** the request is rejected
- **AND** the current admin session retains access to the account administration view

