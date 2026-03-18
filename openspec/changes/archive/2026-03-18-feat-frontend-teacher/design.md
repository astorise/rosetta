# System Design: Vanilla JS Frontend & Firebase Security

## 1. Tech Stack
- **Bundler**: Vite.
- **UI/CSS**: Tailwind CSS (PostCSS).
- **Animations**: GSAP (`gsap` core).
- **Backend as a Service**: Firebase JS SDK v10.

## 2. Web Components Strategy (CRITICAL DOM STRATEGY)
Do NOT use the Shadow DOM (`attachShadow`). Render all templates directly in the Light DOM to allow global Tailwind CSS utility classes to cascade. Rely exclusively on `connectedCallback` and `disconnectedCallback`.
- `<rw-app>`: Root orchestrator.
- `<rw-auth>`: Login form.
- `<rw-dashboard>`: Displays the list of processed files (Firestore listener).
- `<rw-uploader>`: Drag & Drop zone (GSAP animations, Storage upload via `uploadBytesResumable`).

## 3. RBAC & Firebase Security Rules Design
Roles are stored in a Firestore collection `user_roles` (Document ID = Auth UID).
Data schema: `{ role: "admin" | "reader" }`.

**A. Firestore Rules (`firestore.rules`) Logic:**
- `user_roles/{userId}`: Users can ONLY read their own document (`request.auth.uid == userId`). Nobody can write from the client.
- `processed_docs/{docId}`: Any authenticated user can read (`request.auth != null`). Nobody can write from the client (only the Rust Cloud Run backend using Admin SDK can write here).

**B. Storage Rules (`storage.rules`) Logic:**
- `raw-docs-bucket` (Upload bucket): 
  - Reads: Denied to clients (only processed by backend).
  - Writes: **Only allowed if the user is an Admin**. 
  - *Implementation details*: The Storage rule must use cross-service evaluation: `firestore.get(/databases/(default)/documents/user_roles/$(request.auth.uid)).data.role == 'admin'`. Ensure the file size is capped (e.g., `< 50MB`).

## 4. UI/UX & GSAP Integration
- **Theme**: Dark mode by default (Tailwind `dark:` classes).
- **GSAP Uploader**: Scale up the drop zone, add a glowing border on `dragover`.