"""
Ollama Model Fine-Tuning Script
Uses conversation data from lakehouse Gold layer to fine-tune Ollama models
"""

import os
import json
import requests
from datetime import datetime
from typing import List, Dict
import argparse

# Try to import Delta Lake (optional)
try:
    from deltalake import DeltaTable
    DELTA_AVAILABLE = True
except ImportError:
    DELTA_AVAILABLE = False
    print("[WARNING] deltalake not installed. Using local JSON files instead.")

# Try to import MLflow (optional)
try:
    import mlflow
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    print("[WARNING] mlflow not installed. Model versioning disabled.")

# ============================================================================
# Configuration
# ============================================================================

OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
GOLD_PATH_FINETUNING = os.getenv('GOLD_PATH_FINETUNING', 's3a://gold/ollama/finetuning_data')
MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5050')

# ============================================================================
# Load Fine-Tuning Data from Lakehouse
# ============================================================================

def load_finetuning_data_from_lakehouse(limit: int = 1000) -> List[Dict]:
    """
    Load fine-tuning data from Delta Lake Gold layer
    
    Returns list of training examples in format:
    [
        {
            "system_context": "general",
            "messages": [...],
            "expected_response": "..."
        },
        ...
    ]
    """
    if not DELTA_AVAILABLE:
        print("[ERROR] Delta Lake not available. Cannot load from lakehouse.")
        return []
    
    try:
        print(f"[Lakehouse] Loading fine-tuning data from {GOLD_PATH_FINETUNING}...")
        
        # Read Delta table
        dt = DeltaTable(GOLD_PATH_FINETUNING)
        df = dt.to_pandas()
        
        # Convert to training examples
        examples = []
        for _, row in df.head(limit).iterrows():
            example = {
                "system_context": row['training_example']['system_context'],
                "messages": row['training_example']['messages'],
                "expected_response": row['training_example']['expected_response'],
            }
            examples.append(example)
        
        print(f"[Lakehouse] Loaded {len(examples)} training examples")
        return examples
        
    except Exception as e:
        print(f"[Lakehouse] Error loading data: {e}")
        return []

def load_finetuning_data_from_json(filepath: str) -> List[Dict]:
    """Load fine-tuning data from local JSON file (fallback)"""
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        print(f"[Local] Loaded {len(data)} training examples from {filepath}")
        return data
    except Exception as e:
        print(f"[Local] Error loading data: {e}")
        return []

# ============================================================================
# Create Modelfile for Fine-Tuning
# ============================================================================

def create_modelfile(
    base_model: str,
    system_prompt: str,
    examples: List[Dict],
    output_path: str = "Modelfile"
) -> str:
    """
    Create Ollama Modelfile for fine-tuning
    
    Modelfile format:
    FROM base_model
    SYSTEM "system prompt"
    MESSAGE user "example question"
    MESSAGE assistant "example answer"
    """
    
    modelfile_content = f"""# Fine-tuned Ollama model for real estate assistance
# Generated: {datetime.utcnow().isoformat()}
# Training examples: {len(examples)}

FROM {base_model}

SYSTEM \"\"\"{system_prompt}\"\"\"

"""
    
    # Add training examples as MESSAGE pairs
    for i, example in enumerate(examples[:50]):  # Limit to 50 examples in Modelfile
        # Get last user message and expected response
        user_messages = [m for m in example['messages'] if m['role'] == 'user']
        if user_messages:
            last_user_msg = user_messages[-1]['content']
            expected_response = example['expected_response']
            
            modelfile_content += f"""MESSAGE user \"\"\"{last_user_msg}\"\"\"
MESSAGE assistant \"\"\"{expected_response}\"\"\"

"""
    
    # Write to file
    with open(output_path, 'w') as f:
        f.write(modelfile_content)
    
    print(f"[Modelfile] Created at {output_path}")
    return output_path

# ============================================================================
# Fine-Tune Model with Ollama
# ============================================================================

def finetune_ollama_model(
    modelfile_path: str,
    model_name: str
) -> bool:
    """
    Fine-tune Ollama model using Modelfile
    
    This calls: ollama create <model_name> -f <modelfile_path>
    """
    try:
        print(f"[Ollama] Creating fine-tuned model '{model_name}'...")
        
        # Read Modelfile
        with open(modelfile_path, 'r') as f:
            modelfile_content = f.read()
        
        # Call Ollama API to create model
        response = requests.post(
            f"{OLLAMA_API_URL}/api/create",
            json={
                "name": model_name,
                "modelfile": modelfile_content
            },
            stream=True,
            timeout=600  # 10 minutes timeout
        )
        
        # Stream progress
        for line in response.iter_lines():
            if line:
                try:
                    progress = json.loads(line.decode('utf-8'))
                    if 'status' in progress:
                        print(f"[Ollama] {progress['status']}")
                except:
                    pass
        
        print(f"[Ollama] Model '{model_name}' created successfully!")
        return True
        
    except Exception as e:
        print(f"[Ollama] Error creating model: {e}")
        return False

# ============================================================================
# Register Model with MLflow
# ============================================================================

def register_model_with_mlflow(
    model_name: str,
    base_model: str,
    training_examples_count: int,
    metadata: Dict
):
    """Register fine-tuned model with MLflow for versioning"""
    if not MLFLOW_AVAILABLE:
        print("[MLflow] Not available. Skipping model registration.")
        return
    
    try:
        mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
        
        with mlflow.start_run(run_name=f"ollama-finetune-{model_name}"):
            # Log parameters
            mlflow.log_param("base_model", base_model)
            mlflow.log_param("model_name", model_name)
            mlflow.log_param("training_examples", training_examples_count)
            mlflow.log_param("finetuning_method", "ollama_modelfile")
            
            # Log metadata
            for key, value in metadata.items():
                mlflow.log_param(key, value)
            
            # Log model info
            mlflow.log_dict({
                "model_name": model_name,
                "base_model": base_model,
                "training_examples": training_examples_count,
                "created_at": datetime.utcnow().isoformat(),
            }, "model_info.json")
            
            print(f"[MLflow] Model registered: {model_name}")
            
    except Exception as e:
        print(f"[MLflow] Error registering model: {e}")

# ============================================================================
# Main Fine-Tuning Pipeline
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Fine-tune Ollama model using lakehouse data')
    parser.add_argument('--base-model', default='llama2', help='Base Ollama model to fine-tune')
    parser.add_argument('--output-model', default='realestate-assistant', help='Name for fine-tuned model')
    parser.add_argument('--data-source', choices=['lakehouse', 'json'], default='lakehouse', help='Data source')
    parser.add_argument('--json-file', default='training_data.json', help='JSON file path (if data-source=json)')
    parser.add_argument('--limit', type=int, default=1000, help='Max training examples')
    
    args = parser.parse_args()
    
    print(f"""
========================================
Ollama Model Fine-Tuning Pipeline
========================================
Base Model: {args.base_model}
Output Model: {args.output_model}
Data Source: {args.data_source}
========================================
    """)
    
    # Load training data
    if args.data_source == 'lakehouse':
        training_data = load_finetuning_data_from_lakehouse(limit=args.limit)
    else:
        training_data = load_finetuning_data_from_json(args.json_file)
    
    if not training_data:
        print("[ERROR] No training data loaded. Exiting.")
        return
    
    # Create Modelfile
    system_prompt = """You are an expert real estate assistant trained on thousands of real 
    conversations. You help users find properties, schedule tours, understand documents, and 
    make informed real estate decisions. You provide personalized, accurate, and helpful responses."""
    
    modelfile_path = create_modelfile(
        base_model=args.base_model,
        system_prompt=system_prompt,
        examples=training_data,
        output_path="Modelfile.finetuned"
    )
    
    # Fine-tune model
    success = finetune_ollama_model(
        modelfile_path=modelfile_path,
        model_name=args.output_model
    )
    
    if not success:
        print("[ERROR] Fine-tuning failed. Exiting.")
        return
    
    # Register with MLflow
    register_model_with_mlflow(
        model_name=args.output_model,
        base_model=args.base_model,
        training_examples_count=len(training_data),
        metadata={
            "data_source": args.data_source,
            "finetuning_date": datetime.utcnow().isoformat(),
        }
    )
    
    print(f"""
========================================
Fine-Tuning Complete!
========================================
Model Name: {args.output_model}
Training Examples: {len(training_data)}

To use the model:
  export OLLAMA_MODEL={args.output_model}
  python app_enhanced.py

Or update docker-compose.ml-infra.yml:
  OLLAMA_MODEL: {args.output_model}
========================================
    """)

if __name__ == '__main__':
    main()
