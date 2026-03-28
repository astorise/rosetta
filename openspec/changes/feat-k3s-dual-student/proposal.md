# Proposal: Dual-Student Cluster Deployment (k3s)

## 1. Context & Motivation
The Cloud data pipeline (Teacher) is fully operational. It populates a LanceDB vector database (for RAG) and a JSONL dataset (for RL). It is time to deploy the inference architecture on the local k3s hardware cluster: the "Tiny LLM" (RAG Librarian) and the "Small LLM" (RL-trained Migration Engineer).

## 2. Objective
Create the Kubernetes manifests and orchestration configuration to deploy both AI agents on the k3s cluster. 
- The Tiny LLM will mount the LanceDB database.
- The Small LLM will load the custom RL-finetuned weights.