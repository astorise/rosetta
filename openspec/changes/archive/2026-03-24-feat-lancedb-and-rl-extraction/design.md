# System Design: LanceDB & RL Dual-Routing

## 1. Teacher LLM Prompt Engineering
The system prompt in all three Rust workers MUST be updated. The LLM must no longer return raw markdown. It MUST return a valid JSON object matching this schema:

```json
{
  "rag_markdown": "---yaml frontmatter---\n# Content...",
  "pedagogical_value": 8,
  "rl_pair": {
    "prompt": "How to migrate this legacy pattern?",
    "chosen": "Modern elegant solution...",
    "rejected": "Common bad translation..."
  }
}
```

*Implementation Rule:* The LLM must be instructed to only populate `rl_pair` if the `pedagogical_value` (1 to 10) is greater than 7.

## 2. Vectorization Strategy (`shared-gcp/src/vector.rs`)
To vectorize the `rag_markdown` string, the Rust code must make an HTTP POST request using `reqwest` to an OpenAI-compatible embedding API.
- **Endpoint**: `https://api.openai.com/v1/embeddings` (configurable via `EMBEDDING_API_URL` env var, default to OpenAI).
- **Model**: `text-embedding-3-small` (or similar).
- **Auth**: Read `EMBEDDING_API_KEY` from environment variables.
- **Output**: Returns a `Vec<f32>` representing the embedding.

## 3. LanceDB Ingestion (`shared-gcp/src/vector.rs`)
The worker will write directly to GCS using the `lancedb` Rust crate.
- **Connection String**: `gs://<GCP_PROJECT_ID>-rag-markdown-bucket/vectordb`
- **Schema (using Apache Arrow)**:
  - `vector`: FixedSizeList of Float32 (dimension depends on the embedding model, e.g., 1536).
  - `text`: Utf8 (The raw markdown).
- **Operation**: Use `TableCreateMode::Append`. 
- **CRITICAL**: Use the `arrow-array` and `arrow-schema` crates to properly construct the `RecordBatch` before appending to LanceDB.

## 4. RL Dataset Extraction (`shared-gcp/src/rl.rs`)
If the JSON from the LLM contains a non-null `rl_pair`, the worker must append this object as a single line (JSONL format) to the GCS object `gs://<GCP_PROJECT_ID>-rag-markdown-bucket/rl_dataset.jsonl`.
Use the existing Google Cloud Storage SDK logic in `shared-gcp` to download the existing object, append the new line, and upload it back.
`