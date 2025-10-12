import sys
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification



# Auto-detect model path: relative to this script's directory
import os
script_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(script_dir, "saved_model")
if not os.path.isdir(MODEL_PATH):
    raise FileNotFoundError(f"Could not find saved_model directory at {MODEL_PATH}. Please ensure your model files are present.")


# Allow downloading from HuggingFace if not present locally
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, local_files_only=False)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH, local_files_only=False)

model.eval()

def predict(text: str):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=256)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=-1).squeeze()

    label = "Real" if torch.argmax(probs).item() == 1 else "Fake"
    confidence = round(probs.max().item(), 4)
    return {"label": label, "confidence": confidence}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python infer.py \"Your news text here\"")
        sys.exit(1)

    text = " ".join(sys.argv[1:])
    result = predict(text)
    print(result)
