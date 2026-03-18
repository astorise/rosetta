# Implementation Tasks

- [x] **Task 1: Firestore Rules**
  - Create the `firestore.rules` file at the root of the project.
  - Implement the rules defined in `design.md` (read-only for own role, read-only for processed docs, no writes).
- [x] **Task 2: Storage Rules**
  - Create the `storage.rules` file at the root of the project.
  - Implement the cross-service RBAC check using `firestore.get()` to ensure only admins can upload.
  - Add the 50MB file size limit condition.
- [x] **Task 3: Firebase Configuration**
  - Create or update the `firebase.json` file at the root of the project to explicitly declare `"firestore": { "rules": "firestore.rules" }` and `"storage": { "rules": "storage.rules" }`.