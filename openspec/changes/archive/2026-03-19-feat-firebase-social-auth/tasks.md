# Implementation Tasks

## Phase 1: Frontend Auth Update
- [x] **Task 1**: Update `src/components/rw-auth.js` UI to add "Sign in with Google" and "Sign in with GitHub" buttons (styled with Tailwind).
- [x] **Task 2**: Implement `signInWithPopup` logic in `rw-auth.js` using `GoogleAuthProvider` and `GithubAuthProvider` from `firebase/auth`.

## Phase 2: Rust Backend (worker-auth)
- [x] **Task 3**: Add a new binary crate `worker-auth` to the Cargo workspace `rust-workers/Cargo.toml`.
- [x] **Task 4**: Implement the `axum` HTTP handler in `worker-auth` to parse the `google.firebase.auth.user.v1.created` CloudEvent payload.
- [x] **Task 5**: Implement Firestore logic in `worker-auth` to create the document `user_roles/{uid}` with `{ role: "reader" }`.
- [x] **Task 6**: Implement email sending logic in `worker-auth` using `reqwest` and a generic transactional Email API payload.

## Phase 3: Infrastructure & CI/CD
- [x] **Task 7**: Create `rust-workers/Dockerfile.auth` for the new worker.
- [x] **Task 8**: Update `.github/workflows/deploy.yml` to build and push `worker-auth` to Artifact Registry, and deploy it to Cloud Run.
- [x] **Task 9**: Update `.github/workflows/deploy.yml` to create the Eventarc trigger for `google.firebase.auth.user.v1.created` pointing to the `worker-auth` Cloud Run service.