# Proposal: Pure Rust RAG Inference Engine (Candle + LanceDB)

## 1. Context & Motivation
To maximize portability and ease of distribution among collaborators, we want to eliminate Python and heavy ML frameworks from the inference layer. We will replace the placeholder Python concepts with a pure Rust microservice using HuggingFace's `candle` framework. This ensures the Docker image is a highly optimized, standalone deliverable that contains the entire "Tiny LLM" logic (embedding, retrieval, and generation).

## 2. Objective
Create a new Rust worker named `tiny-student` that:
- Runs an HTTP server (`axum`).
- Uses `candle` to load a quantized embedding model (for vectorizing user queries).
- Connects to the local `lancedb` volume to retrieve legacy context.
- Uses `candle` to load a quantized Small LLM (e.g., Phi-3 or Llama-3 in GGUF format) to generate the final response.

## 3. Success Criteria
- A single Rust binary handles the entire RAG pipeline natively.
- The Dockerfile produces an image that downloads the model weights securely via the `hf-hub` crate and caches them.
- Collaborators can run this Docker image locally or on k3s and immediately get a working AI without needing complex ML environment setups.