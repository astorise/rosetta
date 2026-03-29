# Implementation Tasks

## Phase 1: Environment Setup
- [x] Create directory `python-training/`.
- [x] Create `python-training/requirements.txt` including: `torch`, `transformers`, `trl`, `peft`, `bitsandbytes`, `datasets`, `google-cloud-storage`, `accelerate`.
- [x] Create `python-training/Dockerfile` that installs these dependencies and sets `train.py` as the entrypoint.

## Phase 2: Python ML Script
- [x] Create `python-training/train.py`.
- [x] Implement GCS download logic to fetch the `rl_dataset.jsonl` locally within the container.
- [x] Implement the `DPOTrainer` logic: load the base model with QLoRA, load the dataset, and execute the `trainer.train()` loop.
- [x] Implement the adapter merging logic (`model.merge_and_unload()`).
- [x] Implement the GCS upload logic to push the resulting model weights back to the bucket.

## Phase 3: Vertex AI Job Submission
- [x] Create `python-training/submit_job.sh`. This bash script should:
  1. Use `gcloud builds submit` to build and push the Docker image to GCP Artifact Registry.
  2. Use `gcloud ai custom-jobs create` to launch the container on Vertex AI.
  3. Configure the job to request a `n1-standard-4` machine and `1` accelerator of type `NVIDIA_L4`.