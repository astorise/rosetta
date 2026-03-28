from fastapi import FastAPI
import httpx

app = FastAPI()

TINY_LLM_URL = "http://tiny-llm-service"
SMALL_LLM_URL = "http://small-llm-service"

@app.post("/migrate")
async def migrate(query: str):
    # 1. Generate embedding for query (placeholder)
    embedding = [0.1] * 128 

    # 2. Call Tiny LLM service to fetch top-3 Markdown chunks
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{TINY_LLM_URL}/fetch-chunks", json={"embedding": embedding})
        response.raise_for_status()
        chunks = response.json()["chunks"]

    # 3. Call Small LLM service with a prompt combining the fetched chunks and the original query
    prompt = f"Context:
{''.join(chunks)}

Query: {query}"
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{SMALL_LLM_URL}/generate", json={"prompt": prompt})
        response.raise_for_status()
        return response.json()
