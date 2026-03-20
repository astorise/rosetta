use firestore::{FirestoreDb, FirestoreDbOptions};
use serde::{de::DeserializeOwned, Serialize};

pub struct FirestoreHelper {
    db: FirestoreDb,
}

impl FirestoreHelper {
    pub async fn new(project_id: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let db = FirestoreDb::with_options(FirestoreDbOptions::new(project_id.to_string())).await?;
        Ok(Self { db })
    }

    pub async fn insert_metadata<T>(
        &self,
        collection: &str,
        document_id: &str,
        data: &T,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>
    where
        T: Serialize + DeserializeOwned + Sync + Send + 'static,
    {
        self.db
            .fluent()
            .update()
            .in_col(collection)
            .document_id(document_id)
            .object(data)
            .execute::<()>()
            .await?;
        Ok(())
    }
}
