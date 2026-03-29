# System Design: Vertex AI DPO Pipeline

## 1. Architecture Isolation
The training code will live in a completely isolated directory: `python-training/`. It does not interact with the Rust codebase directly. It only interfaces through the Google Cloud Storage bucket.

## 2. Docker Container (`python-training/Dockerfile`)
- **Base Image**: A PyTorch + CUDA base image (e.g., `nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04` or a pre-built Google Deep Learning container).
- **Dependencies**: `torch`, `transformers`, `trl` (Transformer Reinforcement Learning), `peft` (LoRA), `datasets`, `google-cloud-storage`, `llama.cpp` (for GGUF conversion).

## 3. The ML Script (`python-training/train.py`)
The script execution flow:
1. **GCS Download**: Use `google.cloud.storage` to fetch `gs://<PROJECT_ID>-rag-markdown-bucket/rl_dataset.jsonl`.
2. **Data Prep**: Load the JSONL into a HuggingFace `Dataset`. The format already contains `prompt`, `chosen`, and `rejected` keys thanks to our Rust Teacher.
3. **Model Loading**: Load the base model (e.g., `microsoft/Phi-3-mini-4k-instruct`) using 4-bit quantization (BitsAndBytes) to fit easily in a 24GB VRAM GPU.
4. **DPO Training**: Initialize the `DPOTrainer` from the `trl` library. Run the optimization loop.
5. **Merge & Export**: Merge the LoRA adapters back into the base model.
6. **GGUF Conversion**: Use Python bindings or a subprocess call to `llama.cpp`'s `convert.py` to convert the HuggingFace model into a 4-bit quantized `phi-3-rosetta-q4.gguf`.
7. **GCS Upload**: Push the final `.gguf` to `gs://<PROJECT_ID>-rag-markdown-bucket/models/phi-3-rosetta-q4.gguf`.

## 4. Trigger Mechanism
For now, the job will be triggered manually via a `gcloud ai custom-jobs create` CLI command or a simple bash script (`run_training.sh`) that builds the Docker image, pushes it to Google Artifact Registry, and submits the job to Vertex AI requesting 1x `NVIDIA_L4` GPU.