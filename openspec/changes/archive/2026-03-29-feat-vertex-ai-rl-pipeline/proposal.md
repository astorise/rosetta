# Proposal: Serverless Reinforcement Learning via Vertex AI (Python)

## 1. Context & Motivation
Our Rust workers (Cloud Run) successfully extract high-quality pedagogical code migrations into a `rl_dataset.jsonl` file stored on Google Cloud Storage. 
To train our "Small LLM" (Phi-3) using Direct Preference Optimization (DPO) based on this dataset, we cannot use Cloud Run due to CPU limitations, lack of VRAM, and the strict 60-minute timeout. We need a dedicated, ephemeral GPU training environment.

## 2. Objective
Implement a Serverless ML training pipeline using **Google Cloud Vertex AI Custom Training**.
We will create an isolated Python module (`python-training`) that acts as a black box:
1. It spins up a Docker container on Vertex AI with an NVIDIA L4 GPU.
2. It downloads the `rl_dataset.jsonl` from GCS.
3. It uses Python (HuggingFace `trl`, `peft`, `torch`) to perform DPO fine-tuning on Phi-3.
4. It exports the newly trained model in `.gguf` format.
5. It uploads the `phi-3-rosetta.gguf` back to GCS and immediately shuts down.

## 3. Success Criteria
- A standalone Python training script and its Dockerfile are added to the repository.
- The pipeline can successfully read from and write to the GCP storage bucket.
- The training job completes autonomously without requiring a permanent Virtual Machine, ensuring minimal cloud costs.
- The output `.gguf` file is perfectly compatible with the Rust/Candle `tiny-student` on the k3s cluster.