# System Design: Firebase Security Rules (RBAC)

## 1. Global Strategy
We rely on Firebase's native security rules engine. Since the backend Rust workers use the Firebase Admin SDK (or GCP Service Accounts), they bypass these rules entirely. These rules ONLY apply to client-side access (the Vanilla JS frontend or malicious cURL requests).

## 2. Firestore Rules Design (`firestore.rules`)
- **Collection `user_roles/{userId}`**:
  - `read`: Allowed ONLY if `request.auth.uid == userId`. (Users can fetch their own role).
  - `write`: Denied entirely to all clients.
- **Collection `processed_docs/{docId}`**:
  - `read`: Allowed for any authenticated user (`request.auth != null`).
  - `write`: Denied entirely to all clients.

## 3. Storage Rules Design (`storage.rules`)
- **Bucket `raw-docs-bucket`** (or default bucket mapping to `/b/{bucket}/o`):
  - `read`: Denied to all clients (the frontend doesn't need to read raw files, only the Rust backend does).
  - `write`: 
    - Must be authenticated.
    - **Cross-service RBAC check**: `firestore.get(/databases/(default)/documents/user_roles/$(request.auth.uid)).data.role == 'admin'`.
    - **Data validation**: File size must be strictly under 50MB (`request.resource.size < 50 * 1024 * 1024`).
- **Bucket `rag-markdown-bucket`**:
  - `read`: Allowed for authenticated users (`request.auth != null`).
  - `write`: Denied to all clients.

## 4. Configuration
A `firebase.json` file must exist at the root of the project to map the deployment of these rules.