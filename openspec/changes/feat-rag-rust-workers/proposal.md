# Proposal: RAG Data Preparation Pipeline (Rust Serverless & CI/CD)

## 1. Context & Motivation
To feed a highly optimized, local k3s RAG system running lightweight LLMs (Phi-3/Qwen) for legacy code retro-engineering (Java 6, Pacbase, Tapestry 5.4), we need an asynchronous "Teacher" data preparation pipeline. 
This pipeline ingests raw legacy documentation (PDFs, ZIPs of HTML, compiled JARs), uses a High-Level LLM (Teacher) to format, summarize, semantically flatten the context, and inject Metadata Tags. The resulting RAG-ready Markdown is then stored for ingestion by the k3s Vector Database.

## 2. Objective
1. Develop three specialized event-driven Rust microservices (`worker-pdf`, `worker-html`, `worker-jar`) using `axum` and `tokio`.
2. Deploy these workers to **Google Cloud Run** triggered by **Eventarc** (Firebase Storage uploads).
3. Implement a strict **YAML Frontmatter tagging system** to enable Hybrid Search / Metadata Filtering in the vector database.
4. Persist the output in Firebase Storage and log metadata/audit trails in **Firestore**.
5. Automate the build, containerization, and deployment via **GitHub Actions** using secure Workload Identity Federation.

## 3. Success Criteria
- **Memory efficiency**: `worker-html` must stream ZIP files and enforce strict LLM API concurrency using `tokio::sync::Semaphore`.
- **Context optimization**: `worker-jar` must successfully decompile Java bytecode and instruct the LLM to perform "Semantic Flattening" (reducing call trees to native Java 6 APIs).
- **Zero Cross-Hallucination**: The generated Markdown must contain accurate YAML frontmatter tags (merged from the Rust worker context and the LLM semantic analysis).
- **Fully automated CI/CD**: Commits to the `main` branch automatically build the Rust binaries, push Docker images to Artifact Registry, and deploy to Cloud Run securely.