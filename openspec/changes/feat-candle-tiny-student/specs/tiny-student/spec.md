## ADDED Requirements

### Requirement: Tiny student serves retrieval-augmented answers

The system MUST provide a Rust service named `tiny-student` that accepts user questions, retrieves contextual Markdown from LanceDB, and generates a final answer with a local quantized language model.

#### Scenario: A query is submitted to the ask endpoint
- **GIVEN** the `tiny-student` service is running
- **AND** LanceDB is available at `/data/vectordb`
- **WHEN** a client sends `POST /ask` with a JSON body containing a `query` string
- **THEN** the service computes an embedding for the query
- **AND** it retrieves the most relevant Markdown chunks from LanceDB
- **AND** it builds a prompt from the retrieved context and the user query
- **AND** it generates a response with the local quantized language model
- **AND** it returns the generated answer in the HTTP response

### Requirement: Tiny student reuses cached model artifacts

The system MUST download model artifacts through `hf-hub` and reuse a persistent Hugging Face cache so model weights are not re-downloaded on every pod restart.

#### Scenario: The k3s deployment restarts the tiny student pod
- **GIVEN** the `tiny-student` deployment mounts persistent storage for `/root/.cache/huggingface`
- **WHEN** the pod starts after a previous successful model download
- **THEN** the service reuses the cached model artifacts from the mounted cache
- **AND** it does not require a full model re-download before serving requests
