# RAG Feature

## Overview

RAG (Retrieval-Augmented Generation) lets you attach a knowledge base to an LLM agent so that chat responses are grounded in your own documents rather than the model's training data alone.

The system has three distinct entities:

| Entity | What it is |
|--------|------------|
| **Agent** | An LLM config (model + max tokens) |
| **Knowledge Base** | A named vector store — ingested text chunked and embedded in pgvector |
| **RAG** | A pairing of one Agent + one Knowledge Base |

These are independent. Agents and knowledge bases exist on their own; a RAG is created by combining them.

---

## Data model

### `rag_knowledge_bases` table

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| name | VARCHAR | Human-readable name |
| created_at | TIMESTAMP | Auto-set on insert |
| updated_at | TIMESTAMP | Auto-set on insert, updated on edit |

### `rag_chunks` table (managed by `langchain-postgres`)

Stores the actual vector embeddings. Created automatically on server startup.

| Column | Type | Notes |
|--------|------|-------|
| langchain_id | UUID | Primary key |
| content | TEXT | The text chunk |
| embedding | vector(768) | nomic-embed-text embedding |
| langchain_metadata | JSON | Includes `rag_id` for KB scoping |

### `rag_pairs` table

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| agent_id | INTEGER | FK → agents.id (CASCADE DELETE) |
| kb_id | INTEGER | FK → rag_knowledge_bases.id (CASCADE DELETE) |
| created_at | TIMESTAMP | Auto-set on insert |

---

## How it works

### Ingestion

1. User pastes text into the knowledge base detail view
2. Text is split into 500-character chunks with 50-character overlap
3. Each chunk is embedded using `nomic-embed-text` (via Ollama locally)
4. Chunks are stored in `rag_chunks` with `{"rag_id": <id>}` in metadata

### Retrieval (at chat time)

When a RAG card is opened for chat, each user message triggers:
1. The KB is queried for the top-4 most semantically similar chunks
2. Those chunks are prepended to the prompt as context:
   ```
   Use the following context to answer the question:

   <chunk 1>
   ---
   <chunk 2>
   ---
   ...

   Question: <user message>
   ```
3. The augmented prompt is sent to the LLM

If no relevant chunks are found, the message is sent to the LLM without context.

### Embedding model

`nomic-embed-text` — runs locally via Ollama, produces 768-dimensional embeddings.

Pull before first use:
```bash
ollama pull nomic-embed-text
```

---

## UI flow

```
+ Create Knowledge Base  →  name the KB  →  KB card appears
  Click KB card          →  paste text + click "Ingest"
                         →  optionally test with "Query"

+ Create RAG             →  pick an agent + pick a KB  →  RAG card appears
  Click RAG card         →  opens chat (uses agent model + KB context)
  Delete on RAG card     →  removes the pairing only (agent and KB unchanged)
```

---

## Backend files

| File | Purpose |
|------|---------|
| `server/rag.py` | All RAG endpoints + PGVectorStore setup + chunking logic |
| `server/models.py` | `RAGKnowledgeBase` and `RAGPair` SQLAlchemy models |

### Key classes used

```python
from langchain_postgres import PGEngine, PGVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
```

`PGEngine` requires the psycopg3 driver prefix (`postgresql+psycopg://`), distinct from the psycopg2 URL used by SQLAlchemy's `create_engine`.

---

## Chunking

Simple fixed-size character splitter (no external dependency):

```python
def chunk_text(text, chunk_size=500, overlap=50):
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return [c for c in chunks if c.strip()]
```

500 chars fits well within `nomic-embed-text`'s 8192-token context window. 50-char overlap avoids cutting semantic units across boundaries.

---

## Similarity search distance

Default: **cosine similarity** (PGVectorStore default). Appropriate for normalized embeddings from `nomic-embed-text`.
