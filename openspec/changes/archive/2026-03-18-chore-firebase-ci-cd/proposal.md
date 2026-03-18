# Proposal: Firebase CI/CD Pipeline (Frontend & Security Rules)

## 1. Context & Motivation
The Vanilla JS frontend UI and the Firebase Security Rules (`firestore.rules`, `storage.rules`) are now implemented locally. To maintain a robust GitOps workflow, we need to automate their deployment to Firebase (Firebase Hosting for the UI, and Firebase Rules for the BaaS security) whenever changes are merged into the main branch.

## 2. Objective
Create a GitHub Actions workflow that automatically builds the Vite frontend and deploys both the frontend application and the security rules to Firebase. This pipeline will securely authenticate using the existing Google Cloud Workload Identity Federation (WIF) setup to avoid long-lived secret tokens.

## 3. Success Criteria
- Commits modifying the frontend directory or the `.rules` files trigger the workflow.
- The pipeline successfully builds the Vite Vanilla JS project for production.
- The pipeline uses the Firebase CLI (`firebase-tools`) authenticated via GCP Application Default Credentials (ADC) to deploy to Firebase Hosting, Firestore Rules, and Storage Rules simultaneously.