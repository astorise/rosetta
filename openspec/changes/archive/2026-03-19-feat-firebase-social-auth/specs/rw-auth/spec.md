# Auth Component Specification

## ADDED Requirements

### Requirement: Social Authentication Providers
1. The `rw-auth` web component MUST support sign-in via Google and GitHub in addition to email/password.
2. The component MUST use `signInWithPopup` with `GoogleAuthProvider` and `GithubAuthProvider` from the Firebase JS SDK.

#### Scenario: User signs in with Google
- Given the user is on the login page
- When they click "Sign in with Google"
- Then a Google OAuth popup opens and the user is authenticated via Firebase Auth

#### Scenario: User signs in with GitHub
- Given the user is on the login page
- When they click "Sign in with GitHub"
- Then a GitHub OAuth popup opens and the user is authenticated via Firebase Auth

#### Scenario: New user role not yet available
- Given a new user has just authenticated for the first time
- When the `user_roles/{uid}` document does not yet exist in Firestore (backend still processing)
- Then the UI MUST safely fall back to the "reader" view (Dashboard only) without error
