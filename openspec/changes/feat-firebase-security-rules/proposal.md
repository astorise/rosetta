# Proposal: Firebase Infrastructure Security (Firestore & Storage Rules)

## 1. Context & Motivation
The backend Rust workers and the Vanilla JS frontend (`feat-frontend-teacher`) are now implemented. However, the Firebase infrastructure is currently relying on default or overly permissive security rules. To prepare for production and prevent abuse (e.g., unauthorized massive file uploads triggering costly Cloud Run executions), we must strictly lock down Firestore and Cloud Storage at the BaaS level.

## 2. Objective
Write and configure strict Firebase Security Rules (`firestore.rules` and `storage.rules`) implementing Role-Based Access Control (RBAC). The rules must integrate seamlessly with our existing authentication flow and the `user_roles` collection.

## 3. Success Criteria
- **Storage Protection**: Only users explicitly marked as `admin` in Firestore can upload files to the Storage bucket. Payloads must be size-limited.
- **Firestore Protection**: Clients cannot write to any Firestore collection (this is reserved for the Rust backend via Admin SDK). Clients can only read their own role and the list of processed documents.
- The project must include a `firebase.json` properly targeting these new rules files for deployment.