### 3. Fichier : `openspec/changes/feat-lancedb-and-rl-extraction/tasks.md`

# Implementation Tasks

## Phase 1: Dependencies & Shared Logic
- [x] **Task 1**: Add `lancedb`, `arrow-array`, `arrow-schema`, and `reqwest` dependencies to `rust-workers/shared-gcp/Cargo.toml`.
- [x] **Task 2**: Create `rust-workers/shared-gcp/src/vector.rs`. Implement a function to call the Embedding API (HTTP POST) and return a `Vec<f32>`.
- [x] **Task 3**: In `vector.rs`, implement the LanceDB insertion logic connecting to `gs://...` and appending the vector + text + metadata using Apache Arrow record batches.
- [x] **Task 4**: Create `rust-workers/shared-gcp/src/rl.rs`. Implement a function to append a serialized JSON line to a GCS object (`rl_dataset.jsonl`).

## Phase 2: Worker Updates
- [x] **Task 5**: Update the Teacher LLM prompt in `worker-pdf` to enforce the Dual-Routing JSON schema. Wire up the vectorization, LanceDB insertion, and RL JSONL writing.
- [x] **Task 6**: Update `worker-html` with the same Dual-Routing logic.
- [x] **Task 7**: Update `worker-jar` with the same Dual-Routing logic.

## Phase 3: Permissions
- [x] **Task 8**: Ensure the Cloud Run deployment scripts / Service Account retain the `roles/storage.objectAdmin` role to allow the Rust `lancedb` crate to read/write `.lance` files in the bucket.