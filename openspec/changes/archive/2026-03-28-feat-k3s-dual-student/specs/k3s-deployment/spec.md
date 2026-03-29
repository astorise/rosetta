# Spec: k3s Deployment

## ADDED Requirements

### Requirement: Dual-Student Cluster Deployment
This requirement is for deploying the two AI agents on the k3s cluster. The system MUST deploy both AI agents on the k3s cluster.

#### Scenario: Deploying the Tiny LLM and Small LLM
- GIVEN the LanceDB vector database is available
- AND the RL-finetuned model weights are available
- WHEN the k3s manifests are applied
- THEN the "Tiny LLM" (RAG Librarian) should be deployed and running
- AND the "Small LLM" (RL-trained Migration Engineer) should be deployed and running
- AND the Tiny LLM should mount the LanceDB database
- AND the Small LLM should load the custom RL-finetuned weights
