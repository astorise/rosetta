# Implementation Tasks

- [x] In `rust-workers/worker-pdf/src/main.rs`: Locate the API call to the LLM. Add the `DEBUG_LLM_OUTPUT` environment variable check and the `println!` statement right before the `serde_json::from_str` parsing step.
- [x] Repeat the exact same logging logic in `rust-workers/worker-html/src/main.rs`.
- [x] Repeat the exact same logging logic in `rust-workers/worker-jar/src/main.rs`.
