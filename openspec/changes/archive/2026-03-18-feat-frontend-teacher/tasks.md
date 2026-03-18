# Implementation Tasks

## Phase 1: Project Initialization
- [x] Initialize a Vite Vanilla JS project (`npm create vite@latest frontend -- --template vanilla`).
- [x] Install dependencies: `tailwindcss`, `postcss`, `autoprefixer`, `gsap`, `firebase`.
- [x] Configure Tailwind (`tailwind.config.js` and `style.css`).
- [x] Set up Firebase initialization in `src/lib/firebase.js` (export auth, db, storage).

## Phase 2: Firebase Security Rules Generation
- [x] Create `firestore.rules` at the root of the project. Implement the exact read/write constraints defined in `design.md` (no client writes, users can read their own role, authenticated users can read `processed_docs`).
- [x] Create `storage.rules` at the root of the project. Implement the cross-service check using `firestore.get()` to ensure only users with the `admin` role in Firestore can write to the storage bucket. Restrict payload size.

## Phase 3: Web Components Foundation & Auth
- [x] Create `src/components/rw-app.js`. Implement Firebase `onAuthStateChanged` logic. **(Rule: Light DOM only)**.
- [x] Create `src/components/rw-auth.js` for login UI with Tailwind. **(Rule: Light DOM only)**.
- [x] Implement role fetching in `rw-app.js`: upon login, fetch `user_roles/{uid}` and store the role state.

## Phase 4: Dashboard (Reader View)
- [x] Create `src/components/rw-dashboard.js`. **(Rule: Light DOM only)**.
- [x] Implement `onSnapshot` listener on `processed_docs` collection to display RAG-ready Markdown files.
- [x] Add basic GSAP stagger animations on list load.

## Phase 5: Uploader (Admin View)
- [x] Create `src/components/rw-uploader.js`. **(Rule: Light DOM only)**.
- [x] Implement UI (Tailwind) and Drag & Drop event listeners bound in `connectedCallback`.
- [x] Integrate GSAP animations for `dragover` and `dragleave`.
- [x] Implement Firebase Storage upload (`uploadBytesResumable`).
- [x] Animate progress bar width using GSAP based on upload snapshot.

## Phase 6: Assembly
- [x] Register all custom elements in `main.js`.
- [x] Ensure `<rw-app>` conditionally renders `<rw-uploader>` ONLY if the user has the `admin` role.