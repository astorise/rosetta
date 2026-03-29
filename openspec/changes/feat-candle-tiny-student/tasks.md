# Implementation Tasks

## Phase 1: Create the Rust Crate
- [x] Initialize a new binary crate `rust-workers/tiny-student`.
- [ ] Add dependencies to `tiny-student/Cargo.toml`: `candle-core`, `candle-transformers`, `hf-hub`, `tokenizers`, `lancedb`, `axum`, `tokio`, `serde`, `serde_json`.

## Phase 2: Inference Logic
- [ ] Create `rust-workers/tiny-student/src/models.rs`. Implement a function using `hf-hub` to download/cache the GGUF weights of a small LLM (e.g., `microsoft/Phi-3-mini-4k-instruct-gguf`) and an embedding model.
- [ ] Create `rust-workers/tiny-student/src/rag.rs`. Implement the RAG pipeline:
  1. Calculate the embedding of the input text using Candle.
  2. Search LanceDB using the `lancedb` crate.
  3. Format the retrieved context and query.
  4. Run the text generation loop using the quantized Candle model.

## Phase 3: Server & Packaging
- [ ] In `tiny-student/src/main.rs`, set up the `axum` routing (`POST /ask`) to trigger the RAG logic.
- [ ] Create `rust-workers/Dockerfile.student`. Ensure it compiles `tiny-student` and sets up the environment.
- [ ] Update `k3s/tiny-llm/deployment.yaml`: Replace `placeholder-image:latest` with the new `tiny-student` image, and map a volume for `/root/.cache/huggingface` to prevent re-downloading models on pod restarts.