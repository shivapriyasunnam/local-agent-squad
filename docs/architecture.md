# Architecture

## Overview

```
web-app (React)  ──►  server (FastAPI)  ──►  PostgreSQL 17 + pgvector
                           │
                           └──►  Ollama (local LLMs + embeddings)
```

## Components

### Frontend — `web-app/`
React app (single file). Communicates with the FastAPI server over HTTP.

- `src/App.js` — all UI: agent grid, KB grid, RAG grid, modals, chat view, RAG detail view
- All state lives in React hooks — no external state library
- Chat messages are local-only (not persisted)

### Backend — `server/`
FastAPI app. Handles persistence and LLM inference.

| File | Purpose |
|------|---------|
| `server.py` | FastAPI app, agent CRUD + chat endpoint |
| `rag.py` | Knowledge base CRUD, RAG pair CRUD, vector store setup, chunking |
| `models.py` | SQLAlchemy table definitions (`Agent`, `RAGKnowledgeBase`, `RAGPair`) |
| `db.py` | SQLAlchemy engine, session factory, `get_db` dependency |
| `.env` | `DATABASE_URL` environment variable |

### Database — PostgreSQL 17 + pgvector

Four tables:

| Table | Purpose |
|-------|---------|
| `agents` | Agent configs (model, max_tokens, etc.) |
| `rag_knowledge_bases` | Named knowledge bases |
| `rag_chunks` | Vector embeddings (managed by `langchain-postgres`) |
| `rag_pairs` | Agent + KB pairings (the RAG entity) |

### LLMs — Ollama
- Runs models locally
- Chat: `ChatOllama` from `langchain-ollama`
- Embeddings: `OllamaEmbeddings(model="nomic-embed-text")`
- Models must be pulled before use: `ollama pull <model>`

---

## Running locally

```bash
# 1. Start the database
brew services start postgresql@17

# 2. Start the backend (from server/ directory)
cd server
python -m uvicorn server:app --reload --port 8000

# 3. Start the frontend
cd web-app
npm start
```

---

## Key design decisions

**Single React file** — all UI in `App.js`. Simple to navigate for a project at this scale; no routing library needed.

**Two connection strings** — SQLAlchemy uses `psycopg2` (`postgresql://`), `langchain-postgres` uses `psycopg3` (`postgresql+psycopg://`). Both drivers are installed; the URL is derived from the same `DATABASE_URL` env var.

**RAG is its own entity** — a RAG (`rag_pairs`) is a first-class record linking an agent + KB. Agents and KBs exist independently and are not modified when a RAG is created or deleted.

**Shared vector table** — all KBs share one `rag_chunks` table. Chunks are scoped per-KB via `{"rag_id": <id>}` in the metadata JSON column, filtered at query time.

**No file uploads** — ingestion is text-paste only (MVP). File upload can be added later as a new `/ingest` variant.
