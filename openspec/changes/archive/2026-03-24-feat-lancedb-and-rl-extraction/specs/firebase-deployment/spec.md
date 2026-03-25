## ADDED Requirements

### Requirement: Rust document worker deployments preserve dual-routing storage access

The deployment workflow MUST provision the runtime identity used by `worker-pdf`, `worker-html`, and `worker-jar` with the storage permissions required to create and update the dual-routing artifacts in the markdown bucket.

#### Scenario: Dual-routing workers are deployed
- **WHEN** the deployment provisions the runtime identity for the Rust document workers
- **THEN** that identity retains `roles/storage.objectAdmin` on `gs://<PROJECT_ID>-rag-markdown-bucket`
- **AND** the workers can create or update LanceDB objects under `vectordb`
- **AND** the workers can create or update the shared `rl_dataset.jsonl` object
