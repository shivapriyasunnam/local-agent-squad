# RAG Feature — Design Decisions & Planning Notes

This document captures the decisions made while designing and building the RAG feature, including alternatives considered and why certain approaches were chosen.

---

## Problem statement

The app had agents (LLM configs) and chat, but no way to ground responses in user-provided content. The goal was to add a RAG flow: ingest documents → store embeddings → retrieve relevant chunks at chat time → inject as context.

---

## Database choice

**Chosen: PostgreSQL 17 + pgvector (via Homebrew)**

Considered:
- **ChromaDB** — easiest pure-vector option, but would need a separate DB for app state (agents, etc.)
- **SQLite + sqlite-vec** — zero-dependency, good for prototyping, limited vector performance
- **Qdrant** — best vector performance, but overkill and separate from app data

pgvector wins because one DB handles both structured data (agents, RAG pairs) and vector embeddings. `langchain-postgres` integrates directly with the existing LangChain stack.

---

## ORM choice

**Chosen: SQLAlchemy 2.0**

Raw `psycopg2` was considered (simpler, less boilerplate). SQLAlchemy was chosen because:
- `langchain-postgres` (`PGVectorStore`) is built on SQLAlchemy — they integrate without extra wiring
- Vector similarity queries are cleaner as methods (`.cosine_distance()`) vs raw SQL strings
- Alembic migrations become available if the schema grows

---

## Vector store design

**Chosen: Single shared `rag_chunks` table, scoped by `rag_id` in metadata**

Alternative considered: separate table per KB (e.g. `rag_1_docs`, `rag_2_docs`).

Shared table wins for MVP:
- Simpler setup — one `PGVectorStore` instance
- No dynamic table creation needed
- Filtering by `metadata->>'rag_id'` is efficient with a JSON index

The `rag_id` is stored as a JSON metadata field, and `langchain-postgres` filters it at query time.

---

## Embedding model

**Chosen: `nomic-embed-text` via Ollama**

Already listed in the app's model catalog (tagged "embedding"). Runs fully locally, produces 768-dimensional embeddings, 8192-token context window. No API key or network call required.

---

## Connection string split

`langchain-postgres`'s `PGEngine` requires psycopg3 (`postgresql+psycopg://`), while SQLAlchemy's `create_engine` uses psycopg2 (`postgresql://`). Both drivers coexist in the same venv. The psycopg3 URL is derived at runtime:

```python
PSYCOPG_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
```

---

## RAG as a first-class entity

**Initial approach:** attach a `rag_id` FK to the `agents` table. The agent card gets tagged with the KB name.

**Problem:** user feedback — tagging an existing agent card is confusing. A RAG should be its own thing, not a modification of an agent.

**Final approach:** `rag_pairs` table with `agent_id` + `kb_id`. A RAG is created via "+ Create RAG" which shows available agents and KBs. The resulting RAG card is a new independent box. Agents and KBs are never modified.

This also means:
- The same agent can be in multiple RAGs (with different KBs)
- The same KB can be used by multiple agents
- Deleting a RAG removes only the pairing

---

## Chunking strategy

Simple fixed-size character splitter, no external dependency:
- **Chunk size:** 500 characters — well within `nomic-embed-text`'s context window
- **Overlap:** 50 characters (10%) — prevents semantic ideas being cut at chunk boundaries
- **Implementation:** ~6 lines of Python, no `langchain-text-splitters` needed

---

## UI iterations

1. **First version:** KB dropdown inside "Create Agent" modal
   - Problem: clutters agent creation, mixes concerns
   - Removed in favour of dedicated "Create RAG" flow

2. **Second version:** "Create RAG" patches the selected agent with `rag_id`, agent card gets a RAG badge
   - Problem: modifies existing entities, not a new box
   - Replaced with `rag_pairs` table approach

3. **Final version:** RAG is a new entity, new card, agent and KB untouched
