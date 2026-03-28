# Implementation Tasks

## Phase 1: Storage Configuration
- [x] Create `k3s/base/pvc-lancedb.yaml` to request local storage for the vectorized data.
- [x] Create `k3s/base/pvc-models.yaml` to cache the HuggingFace/custom models.

## Phase 2: Deployments
- [x] Create `k3s/tiny-llm/deployment.yaml` and `service.yaml`. Ensure the LanceDB PVC is mounted at `/data/vectordb`. 
- [x] Create `k3s/small-llm/deployment.yaml` and `service.yaml`. Configure it to run the `vllm/vllm-openai` Docker image pointing to the custom model path.

## Phase 3: The Orchestrator
- [x] Create `k3s/router/main.py` (a minimal FastAPI script).
- [x] Implement the endpoint `/migrate`. Logic: 
  1. Generate embedding for query.
  2. Call Tiny LLM service (or LanceDB directly in the router) to fetch top-3 Markdown chunks.
  3. Call Small LLM service with a prompt combining the fetched chunks and the original query.