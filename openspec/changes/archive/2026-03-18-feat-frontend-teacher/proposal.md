# Proposal: Teacher Frontend UI & Firebase Security Rules

## 1. Context & Motivation
The backend data preparation pipeline (Rust/Cloud Run) is operational and awaits raw legacy files in Firebase Storage. 
To facilitate the ingestion of these documents, we need a lightweight, modern, and secure web interface (Vanilla JS + Web Components). Crucially, the frontend UI logic must be backed by strict Backend-as-a-Service security using Firebase Security Rules to prevent unauthorized uploads and data tampering.

## 2. Objective
1. Build a Single Page Application (SPA) using purely **Vanilla JavaScript and standard Web Components** (Tailwind CSS, GSAP).
2. Implement **RBAC (Role-Based Access Control)**: 
  - `Admin`: Can view the dashboard, drag & drop files, and trigger uploads to Firebase Storage.
  - `Reader`: Can only view the dashboard of successfully processed documents.
3. Write strict **Firebase Security Rules** (`firestore.rules` and `storage.rules`) to enforce this RBAC at the infrastructure level, preventing any API abuse.

## 3. Success Criteria
- Zero heavy framework dependencies. Native DOM APIs and Light DOM Web Components only (for Tailwind compatibility).
- Seamless Drag & Drop experience powered by GSAP.
- Secure direct-to-Storage uploads using the Firebase JS SDK v10+.
- **Security**: The `storage.rules` must dynamically evaluate the user's role by reading the Firestore `user_roles` collection before allowing an upload. Clients cannot write to Firestore.