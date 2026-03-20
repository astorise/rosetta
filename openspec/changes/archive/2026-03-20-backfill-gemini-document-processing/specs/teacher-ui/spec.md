## MODIFIED Requirements

### Requirement: Teacher Dashboard and Upload
1. The system MUST provide a secure SPA frontend for teachers.
2. The UI MUST use vanilla JS web components.
3. Admin raw uploads MUST be initiated through a privileged backend that creates a resumable upload session for the raw-docs ingestion bucket.

#### Scenario: Admin User Uploads File
- **GIVEN** the user is authenticated and has the "admin" role
- **WHEN** they drag and drop a raw document into the `<rw-uploader>` component
- **THEN** the UI requests a resumable upload session from a privileged backend endpoint
- **AND** the browser uploads the file to the raw-docs GCS ingestion bucket using that session

#### Scenario: Reader User Views Dashboard
- **GIVEN** the user is authenticated and has the "reader" role
- **WHEN** they access the system
- **THEN** the `<rw-uploader>` is hidden
- **AND** they can only view `processed_docs` via `<rw-dashboard>`

## ADDED Requirements

### Requirement: Dashboard cards use processed document metadata

The dashboard MUST render processed document cards from Firestore `processed_docs` metadata and MUST tolerate legacy records that do not yet include Gemini-generated summary fields.

#### Scenario: Processed document includes enriched metadata
- **WHEN** `<rw-dashboard>` receives a `processed_docs` record containing `title`, `excerpt`, `summary`, or semantic tags
- **THEN** it renders the best available title and summary text for that document card
- **AND** it may display document type and semantic tags alongside the card

#### Scenario: Historical processed document lacks Gemini fields
- **WHEN** `<rw-dashboard>` receives a `processed_docs` record that does not contain `title`, `excerpt`, or `summary`
- **THEN** it falls back to deterministic fields such as the source filename or document ID
- **AND** the dashboard continues rendering without treating the record as invalid
