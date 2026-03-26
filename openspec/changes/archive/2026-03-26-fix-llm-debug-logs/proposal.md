# Proposal: LLM Output Debug Logging

## 1. Context & Motivation
The Rust workers now expect a strict JSON output from the Teacher LLM (Dual-Routing for LanceDB and RL). However, LLMs can sometimes hallucinate formatting (e.g., adding markdown blocks around the JSON). When `serde_json` fails to parse this, we currently lose the raw output, making debugging impossible.

## 2. Objective
Introduce a debug mode using an environment variable (`DEBUG_LLM_OUTPUT`). When enabled, the workers will print the raw string received from the LLM to standard output before attempting JSON deserialization. This will automatically be captured by Google Cloud Logging.