# Proposal: Social Auth (Google/GitHub) & Onboarding Workflow

## 1. Context & Motivation
The current application uses Email/Password authentication. To improve user experience, we want to enable Social Authentication (Google and GitHub) via Firebase Auth. 
Additionally, we need a secure onboarding workflow: new users must default to a "reader" (viewer) role, and an administrator must be notified by email upon their registration to manually upgrade them to "admin" (writer) if necessary.

## 2. Objective
- Integrate Google and GitHub authentication providers in the frontend (`rw-auth` Web Component).
- Enforce that all new users receive the `reader` role securely via the backend.
- Create an automated backend process that triggers on new user registration to send an email notification to the administrator.

## 3. Success Criteria
- Users can successfully log in using Google or GitHub popups.
- A new user automatically gets a `reader` role in the `user_roles` collection without giving the client write-access to Firestore.
- An email is automatically sent to the configured admin email address when a new Firebase Auth user is created.