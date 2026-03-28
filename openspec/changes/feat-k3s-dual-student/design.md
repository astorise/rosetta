# System Design: Dual-Student k3s Architecture

## 1. The Tiny LLM (RAG) Pod
- **Role**: Fetch context from LanceDB based on user queries.
- **Engine**: A lightweight Python API (FastAPI) wrapping LanceDB and a fast local model (e.g., `Qwen-1.5B` via Ollama or vLLM).
- **Storage**: A `PersistentVolumeClaim` (PVC) mapping to local storage or an NFS share where the LanceDB `vectordb` folder is synced from GCP.

## 2. The Small LLM (RL) Pod
- **Role**: Execute complex code migrations using its specialized training.
- **Engine**: A high-throughput inference server (`vLLM` recommended) serving the RL-finetuned model (e.g., `Llama-3-8B-Instruct-Rosetta`).
- **Storage**: Mounts the model weights. No vector database needed.

## 3. The Router API
- A lightweight entry point deployment (FastAPI) that receives user questions, calls the Tiny LLM to get the legacy context via RAG, and pipes that context into the Small LLM prompt to get the final modernized code.