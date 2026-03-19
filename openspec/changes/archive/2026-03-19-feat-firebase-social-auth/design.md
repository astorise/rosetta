# System Design: Social Auth & Admin Notification

## 1. Frontend Integration (Vanilla JS)
- Update `src/components/rw-auth.js` to include two new buttons for Google and GitHub.
- Use Firebase JS SDK's `signInWithPopup` with `GoogleAuthProvider` and `GithubAuthProvider`.
- The frontend logic remains the same for role fetching: it reads from `user_roles/{uid}`. If the document doesn't exist yet (because the backend is still processing the event), the UI must safely fallback to the `reader` view (Dashboard only).

## 2. Backend Trigger (Eventarc & Rust Cloud Run)
To maintain our Rust serverless architecture and keep the frontend secure, we will introduce a new worker: `worker-auth`.
- **Trigger**: Eventarc listening to `google.firebase.auth.user.v1.created`.
- **Logic**:
  1. Receives the CloudEvent containing the new user's UID and email.
  2. Uses the Firebase Admin SDK (via GCP credentials) to write a new document to Firestore: `user_roles/{uid}` with data `{ role: "reader", email: user_email }`.
  3. Dispatches an email to the admin.

## 3. Email Delivery Strategy
- The `worker-auth` Rust service will use the `reqwest` HTTP client to call a transactional email API (e.g., Resend, SendGrid, or Mailjet) to send the notification to the admin.
- The Admin email address and the Email API key MUST be provided to the Cloud Run service via environment variables (`ADMIN_EMAIL`, `EMAIL_API_KEY`).

## 4. Security Rules
- No changes to `firestore.rules` are needed. Clients still cannot write to `user_roles`. The Rust backend bypasses these rules automatically because it runs with Google Application Default Credentials (ADC).