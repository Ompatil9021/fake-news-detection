# gemini-detector/backend/ml_model/train_transformer.py

import pandas as pd
from datasets import Dataset, DatasetDict
from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

# ---------------- CONFIG ---------------- #
MODEL_NAME = "microsoft/deberta-v3-base"   # or "roberta-base"
MAX_LEN = 256
BATCH_SIZE = 8
EPOCHS = 3
OUTPUT_DIR = "./ml_model/saved_model"
# ---------------------------------------- #

# 1. Load dataset
true_df = pd.read_csv("./ml_model/dataset/True.csv")
fake_df = pd.read_csv("./ml_model/dataset/Fake.csv")

true_df["label"] = 1
fake_df["label"] = 0

df = pd.concat([true_df, fake_df]).sample(frac=1).reset_index(drop=True)
df["text"] = df["title"].fillna("") + " " + df["text"].fillna("")

# 2. Split into train/validation/test
train_size = 0.8
train_df = df.sample(frac=train_size, random_state=42)
temp_df = df.drop(train_df.index)
val_df = temp_df.sample(frac=0.5, random_state=42)
test_df = temp_df.drop(val_df.index)

# Convert to HuggingFace Datasets
train_ds = Dataset.from_pandas(train_df)
val_ds = Dataset.from_pandas(val_df)
test_ds = Dataset.from_pandas(test_df)
dataset = DatasetDict({"train": train_ds, "validation": val_ds, "test": test_ds})

# 3. Tokenizer
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=MAX_LEN)

dataset = dataset.map(tokenize, batched=True)
dataset = dataset.remove_columns(["title", "text", "date", "__index_level_0__"])
dataset.set_format("torch")

# 4. Model
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, num_labels=2)

# 5. Metrics
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    acc = accuracy_score(labels, preds)
    prec, rec, f1, _ = precision_recall_fscore_support(labels, preds, average="binary")
    return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1}

# 6. Training
args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    learning_rate=2e-5,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    num_train_epochs=EPOCHS,
    weight_decay=0.01,
    logging_dir="./logs",
    logging_steps=50,
    save_total_limit=2,
)


trainer = Trainer(
    model=model,
    args=args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    compute_metrics=compute_metrics,
)

trainer.train()

# 7. Save model
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

# 8. Final test evaluation
metrics = trainer.evaluate(dataset["test"])
print("Test set metrics:", metrics)
