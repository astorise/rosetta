import os
import torch
from google.cloud import storage
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, BitsAndBytesConfig
from peft import LoraConfig
from trl import DPOTrainer

# --- Configuration ---
PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "your-gcp-project-id")
BUCKET_NAME = f"{PROJECT_ID}-rag-markdown-bucket" 
GCS_DATASET_BLOB_NAME = "rl_dataset.jsonl"
LOCAL_DATASET_PATH = "rl_dataset.jsonl"
MODEL_NAME = "microsoft/Phi-3-mini-4k-instruct"
NEW_MODEL_NAME = "phi-3-rosetta-dpo"

def download_from_gcs(bucket_name, source_blob_name, destination_file_name):
    """Downloads a file from the bucket."""
    print(f"Downloading {source_blob_name} from bucket {bucket_name} to {destination_file_name}...")
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)
    blob.download_to_filename(destination_file_name)
    print(f"File {source_blob_name} downloaded to {destination_file_name}.")

def upload_to_gcs(bucket_name, source_directory, destination_blob_prefix):
    """Uploads a directory to the bucket."""
    if not os.path.isdir(source_directory):
        print(f"Error: Source directory {source_directory} not found. Aborting upload.")
        return

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)

    for root, _, files in os.walk(source_directory):
        for filename in files:
            local_path = os.path.join(root, filename)
            
            # Create a blob path that preserves the directory structure
            relative_path = os.path.relpath(local_path, source_directory)
            blob_path = os.path.join(destination_blob_prefix, relative_path)
            
            print(f"Uploading {local_path} to gs://{bucket_name}/{blob_path}...")
            blob = bucket.blob(blob_path)
            blob.upload_from_filename(local_path)

    print(f"Directory {source_directory} uploaded to gs://{bucket_name}/{destination_blob_prefix}.")

def main():
    """Main training script execution."""
    # Download the dataset from GCS
    download_from_gcs(BUCKET_NAME, GCS_DATASET_BLOB_NAME, LOCAL_DATASET_PATH)

    # 1. Load the dataset
    print("Loading dataset...")
    dataset = load_dataset("json", data_files=LOCAL_DATASET_PATH, split="train")

    # 2. Load Model and Tokenizer with QLoRA
    print("Loading model and tokenizer...")
    quant_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=quant_config,
        trust_remote_code=True,
        torch_dtype=torch.bfloat16,
        device_map="auto"
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 3. LoRA Configuration
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules="all-linear"
    )

    # 4. Training Arguments
    training_args = TrainingArguments(
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        max_steps=100, # Placeholder, adjust as needed
        learning_rate=5e-5,
        logging_steps=10,
        output_dir="./results",
        optim="paged_adamw_8bit",
        fp16=False, # Not used with bfloat16
        bf16=True, # Use bfloat16 for training
    )

    # 5. Initialize DPOTrainer
    print("Initializing DPOTrainer...")
    dpo_trainer = DPOTrainer(
        model,
        ref_model=None, # Automatically created by the trainer
        args=training_args,
        beta=0.1,
        train_dataset=dataset,
        tokenizer=tokenizer,
        peft_config=peft_config,
    )

    # 6. Start Training
    print("Starting DPO training...")
    dpo_trainer.train()
    print("Training complete.")

    # 7. Merge LoRA adapters and save model
    print("Merging LoRA adapters...")
    dpo_trainer.model.merge_and_unload()
    print("Saving merged model...")
    dpo_trainer.model.save_pretrained(NEW_MODEL_NAME)
    tokenizer.save_pretrained(NEW_MODEL_NAME)

    # 8. Upload the final model to GCS
    upload_to_gcs(BUCKET_NAME, NEW_MODEL_NAME, f"models/{NEW_MODEL_NAME}")

    print("Training pipeline finished successfully.")

if __name__ == "__main__":
    main()
