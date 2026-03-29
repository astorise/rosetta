# System Design: Candle RAG Student

## 1. Core Technologies
- **Inference Engine**: `candle-core`, `candle-transformers`, `candle-nn`.
- **Model Hub**: `hf-hub` (to fetch weights from HuggingFace directly in Rust).
- **Vector DB**: `lancedb` (to search the mounted PVC).
- **Web Server**: `axum` (to serve the API).

## 2. Request Flow
1. **Receive**: `POST /ask { "query": "How to migrate this?" }`
2. **Embed**: Use `candle` with a small model (e.g., `all-MiniLM-L6-v2`) to turn the query into a `Vec<f32>`.
3. **Retrieve**: Query LanceDB (`/data/vectordb`) using the vector. Retrieve top 3 markdown chunks.
4. **Prompt Builder**: Construct a prompt `Context: {chunks}\n\nQuestion: {query}`.
5. **Generate**: Stream the prompt into the quantized LLM (e.g., `Phi-3-mini-4k-instruct-q4.gguf`) loaded in memory via `candle`.
6. **Respond**: Return the modernized code string.

## 3. Deliverable (Docker Image)
The `Dockerfile.student` will compile the Rust binary. At runtime, the binary uses `hf-hub` to cache the models in `/models` (mounted as a PVC in k3s) so it only downloads them once, making the container portable and self-sufficient.