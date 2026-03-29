#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Configuration ---
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1" # Or your preferred GCP region
export AR_REPO="rosetta-rl-training"
export IMAGE_NAME="phi-3-dpo-trainer"
export IMAGE_TAG="latest"

# Full image URI
export IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}"

# --- 1. Build and Push Docker Image ---
echo "Building and pushing Docker image to Artifact Registry..."
gcloud builds submit --tag "${IMAGE_URI}" .

echo "Image successfully pushed to ${IMAGE_URI}"

# --- 2. Submit Vertex AI Custom Job ---
# Unique Job Name
export JOB_NAME="rosetta_dpo_training_$(date +%Y%m%d_%H%M%S)"

echo "Submitting Vertex AI custom job: ${JOB_NAME}"

gcloud ai custom-jobs create 
  --project="${PROJECT_ID}" 
  --region="${REGION}" 
  --display-name="${JOB_NAME}" 
  --worker-pool-spec="machine-type=n1-standard-4,accelerator-type=NVIDIA_L4,accelerator-count=1,replica-count=1,container-image-uri=${IMAGE_URI}" 
  --service-account="your-service-account@${PROJECT_ID}.iam.gserviceaccount.com" # <-- IMPORTANT: Replace with your service account

echo "Job ${JOB_NAME} submitted to Vertex AI."
echo "Monitor its progress in the Google Cloud Console."
