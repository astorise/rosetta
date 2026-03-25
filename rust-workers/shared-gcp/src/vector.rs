use arrow_array::{FixedSizeListArray, RecordBatch, StringArray};
use arrow_schema::{DataType, Field, Schema};
use lancedb::connect;
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;

#[derive(Serialize)]
struct EmbeddingRequest<'a> {
    input: &'a str,
    model: &'a str,
}

#[derive(Deserialize)]
struct Embedding {
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    data: Vec<Embedding>,
}

pub async fn get_embedding(text: &str) -> Result<Vec<f32>, reqwest::Error> {
    let api_key = env::var("EMBEDDING_API_KEY").expect("EMBEDDING_API_KEY not set");
    let api_url = env::var("EMBEDDING_API_URL")
        .unwrap_or_else(|_| "https://api.openai.com/v1/embeddings".to_string());
    let model = "text-embedding-3-small";

    let client = reqwest::Client::new();
    let request_body = EmbeddingRequest {
        input: text,
        model,
    };

    let res = client
        .post(&api_url)
        .bearer_auth(api_key)
        .json(&request_body)
        .send()
        .await?;

    let response_json: EmbeddingResponse = res.json().await?;

    Ok(response_json.data[0].embedding.clone())
}

pub async fn add_to_lancedb(
    text: &str,
    vector: Vec<f32>,
) -> Result<(), Box<dyn std::error::Error>> {
    let project_id = env::var("GCP_PROJECT_ID").expect("GCP_PROJECT_ID not set");
    let uri = format!("gs://{}-rag-markdown-bucket/vectordb", project_id);
    let db = connect(&uri).execute().await?;
    let tbl = db.open_table("vectors").execute().await?;

    let schema = Arc::new(Schema::new(vec![
        Field::new(
            "vector",
            DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                1536,
            ),
            true,
        ),
        Field::new("text", DataType::Utf8, true),
    ]));

    let vectors = FixedSizeListArray::from_iter_primitive::<f32, _, _>(
        vec![Some(vector)].into_iter(),
        1536,
    );
    let texts = StringArray::from(vec![text]);

    let batch = RecordBatch::try_new(
        schema.clone(),
        vec![Arc::new(vectors), Arc::new(texts)],
    )?;

    tbl.add(Box::new(vec![batch]), None).execute().await?;

    Ok(())
}
