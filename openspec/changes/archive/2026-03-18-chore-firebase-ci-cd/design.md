# System Design: Firebase CI/CD via GitHub Actions

## 1. Trigger Strategy
The workflow (`deploy-firebase.yml`) should trigger on `push` to the `main` branch, specifically when paths related to the frontend (`frontend/**`), Firebase configuration (`firebase.json`, `.firebaserc`), or security rules (`*.rules`) are modified.

## 2. Authentication Architecture (Workload Identity Federation)
We will reuse the exact same WIF architecture established for the Rust workers.
- **Action**: `google-github-actions/auth@v2`
- **Secrets**: Uses `WIF_PROVIDER` and `GCP_SERVICE_ACCOUNT`.
- **Firebase CLI Support**: The Firebase CLI automatically detects Google Application Default Credentials (ADC) provided by this action. No need for a legacy `FIREBASE_TOKEN`.

## 3. Pipeline Steps
1. **Checkout**: Fetch the repository.
2. **Setup Node.js**: Install Node environment (`actions/setup-node`) for the Vite build and Firebase CLI.
3. **Install Dependencies**: Run `npm ci` inside the frontend directory.
4. **Build Frontend**: Run `npm run build` to generate the static files in `dist/`.
5. **Authenticate to GCP**: Use WIF to securely obtain short-lived credentials.
6. **Deploy to Firebase**: Run `npx firebase-tools deploy --project <PROJECT_ID>` to deploy Hosting, Firestore rules, and Storage rules based on `firebase.json`.

## 4. Configuration Requirements
Ensure `firebase.json` has a `hosting` target pointing to the Vite build output directory (usually `frontend/dist` or `dist`), alongside the `firestore` and `storage` rules targets.