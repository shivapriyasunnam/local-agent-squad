# Architecture

## Overview

```
web-app (React)  ──►  server (FastAPI)  ──►  PostgreSQL + pgvector
                           │
                           └──►  Ollama (local LLMs)
```

## Components

### Frontend — `web-app/`
React app. Communicates with the FastAPI server over HTTP.

- `src/App.js` — all UI: agent list, create/edit modal, chat view
- Agents are fetched from the API on load and kept in React state
- Chat messages are local-only (not persisted)

### Backend — `server/`
FastAPI app. Handles agent persistence and LLM chat requests.

| File         | Purpose                                      |
|--------------|----------------------------------------------|
| `server.py`  | FastAPI app, all route handlers              |
| `db.py`      | SQLAlchemy engine, session factory, `get_db` |
| `models.py`  | SQLAlchemy `Agent` table definition          |
| `.env`       | `DATABASE_URL` environment variable          |

### Database — PostgreSQL 17 + pgvector
- Stores agent configurations
- pgvector extension installed and ready for RAG (not yet used)

### LLMs — Ollama
- Runs models locally
- Called via `langchain-ollama`'s `ChatOllama`
- Models must be pulled before use: `ollama pull <model>`

## Running locally

```bash
# 1. Start the database
brew services start postgresql@17

# 2. Start the backend
cd server
python -m uvicorn server:app --reload --port 8000

# 3. Start the frontend
cd web-app
npm start
```

## Planned features
- **RAG** — document ingestion + vector similarity search using pgvector
