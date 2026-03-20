## ADDED Requirements

### Requirement: PDF uploads are converted into Markdown artifacts

The system MUST process raw `.pdf` uploads from the raw-docs ingestion bucket through `worker-pdf` and publish a corresponding Markdown artifact to the configured Markdown bucket.

#### Scenario: Eventarc delivers a PDF object finalize event
- **WHEN** a new `.pdf` object is finalized in the raw-docs ingestion bucket
- **THEN** `worker-pdf` downloads the source object
- **AND** it writes a Markdown artifact named `<source-object>.md` to the Markdown bucket

### Requirement: Processed PDFs include deterministic and Gemini-enriched metadata

The system MUST enrich processed PDFs with deterministic source metadata and Gemini-generated semantic metadata. The generated Markdown MUST include merged YAML frontmatter, and Firestore `processed_docs/{docId}` records MUST expose the reader-facing metadata needed by the dashboard.

#### Scenario: PDF processing completes successfully
- **WHEN** `worker-pdf` finishes processing a PDF
- **THEN** the Markdown artifact contains YAML frontmatter with `source_filename`, `extraction_timestamp`, `document_type`, `technologies`, and `semantic_tags`
- **AND** `processed_docs/{docId}` includes `title`, `excerpt`, `summary`, `technologies`, `semantic_tags`, and `createdAt`

### Requirement: PDF metadata publication is idempotent under repeated delivery

The system MUST treat PDF processing as at-least-once delivery and MUST publish `processed_docs/{docId}` metadata through an idempotent write path so repeated deliveries do not fail with a Firestore already-exists error.

#### Scenario: Eventarc redelivers the same PDF event
- **WHEN** the same PDF object is delivered more than once to `worker-pdf`
- **THEN** the worker updates or preserves the same `processed_docs/{docId}` record
- **AND** repeated delivery does not fail solely because the Firestore document already exists
