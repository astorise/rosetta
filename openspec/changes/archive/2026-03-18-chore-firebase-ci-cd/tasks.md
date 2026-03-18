# Implementation Tasks

- [x] **Task 1: Update Firebase Configuration**
  - Check or update `firebase.json` at the project root to include the `hosting` configuration. Ensure the `public` directory points to the Vite build output (e.g., `dist` or `frontend/dist` depending on the folder structure).
- [x] **Task 2: Create GitHub Actions Workflow**
  - Create `.github/workflows/deploy-firebase.yml`.
  - Configure the `on: push` trigger with the correct path filters (`frontend/**`, `*.rules`, `firebase.json`).
- [x] **Task 3: Implement Workflow Steps**
  - Add Node.js setup and dependency installation (`npm install` or `npm ci`).
  - Add the Vite build step (`npm run build`).
  - Add the `google-github-actions/auth@v2` step using the `WIF_PROVIDER` and `GCP_SERVICE_ACCOUNT` secrets.
  - Add the deployment step running `npx firebase-tools deploy --project ${{ secrets.GCP_PROJECT_ID }}`.