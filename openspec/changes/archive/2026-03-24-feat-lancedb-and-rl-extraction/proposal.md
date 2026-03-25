## Why

The Rust Cloud Run document workers already transform legacy source files into Markdown artifacts for downstream retrieval. That pipeline currently stops at Markdown generation, which leaves the local "Dual-Student" architecture without the two derived assets it now depends on: a vector store for the tiny RAG model and curated instructional pairs for later RL fine-tuning.

This change captures the missing product contract for dual-routing. After a document is processed by `worker-pdf`, `worker-html`, or `worker-jar`, the system must route the canonical Markdown into LanceDB and optionally extract an RL example when the teacher output is pedagogically strong enough.

## What Changes

- Add a new `document-dual-routing` capability covering the structured teacher payload, LanceDB persistence, and conditional RL dataset extraction across the Rust document workers.
- Extend the `firebase-deployment` capability so the deployed worker runtime keeps the storage permissions required to update the shared vector and RL artifacts in the markdown bucket.

## Capabilities

### New Capabilities

- `document-dual-routing`: processed document outputs are converted into vector-store rows and optional RL dataset examples.

### Modified Capabilities

- `firebase-deployment`: Rust worker deployments retain the object-storage access required to maintain `vectordb` and `rl_dataset.jsonl` in the markdown bucket.

## Impact

- Affected workers: `rust-workers/worker-pdf`, `rust-workers/worker-html`, and `rust-workers/worker-jar`
- Affected shared library: `rust-workers/shared-gcp` dual-routing helpers for embeddings, LanceDB writes, and RL dataset publication
- Affected storage artifacts: `gs://<PROJECT_ID>-rag-markdown-bucket/vectordb` and `gs://<PROJECT_ID>-rag-markdown-bucket/rl_dataset.jsonl`
- Affected runtime configuration: Cloud Run worker service-account access to create and update objects in the markdown bucket
