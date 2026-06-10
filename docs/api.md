# API Reference

Base URL: `http://localhost:8000`

---

## Agents

### `GET /agents`
Returns all agents ordered by creation time.

**Response**
```json
[
  {
    "id": 1,
    "is_multi_model": false,
    "model": "llama3.1",
    "models": null,
    "max_tokens": 2048,
    "created_at": "2026-06-09T10:00:00",
    "updated_at": "2026-06-09T10:00:00"
  }
]
```

### `POST /agents`
Creates a new agent.

**Body**
```json
{ "is_multi_model": false, "model": "llama3.1", "models": null, "max_tokens": 2048 }
```

**Response** — created agent object with assigned `id`.

### `PUT /agents/{id}`
Updates an existing agent. Body same shape as `POST /agents`.

### `DELETE /agents/{id}`
```json
{ "ok": true }
```

---

## Chat

### `POST /chat`
Sends a message to a model. If `rag_id` is provided, retrieves relevant chunks from that KB and injects them as context before calling the LLM.

**Body**
```json
{
  "model": "llama3.1",
  "message": "What is photosynthesis?",
  "max_tokens": 2048,
  "rag_id": 1
}
```

`rag_id` is optional. Omit or set to `null` for plain chat.

**Response**
```json
{ "reply": "Photosynthesis is..." }
```

**Errors**
- `404` — model not found locally. Fix: `ollama pull <model>`

---

## Knowledge Bases

### `GET /rags`
Lists all knowledge bases.

### `POST /rags`
Creates a new knowledge base.

**Body**
```json
{ "name": "Biology Textbook" }
```

**Response** — `{ id, name, created_at, updated_at }`

### `DELETE /rags/{id}`
Deletes the KB and all its vector chunks from `rag_chunks`.

### `POST /rags/{id}/ingest`
Chunks and embeds text, stores in pgvector.

**Body**
```json
{ "text": "Photosynthesis is the process by which..." }
```

**Response**
```json
{ "chunks_added": 4 }
```

### `POST /rags/{id}/query`
Semantic similarity search against the KB.

**Body**
```json
{ "query": "how does photosynthesis work?", "k": 4 }
```

**Response**
```json
[
  { "content": "Photosynthesis is...", "metadata": { "rag_id": 1 } }
]
```

---

## RAG Pairs

### `GET /rag-pairs`
Lists all RAG pairs (agent + KB pairings), with denormalized agent and KB info.

**Response**
```json
[
  {
    "id": 1,
    "agent_id": 1,
    "kb_id": 1,
    "created_at": "2026-06-09T10:00:00",
    "agent": { "id": 1, "model": "llama3.1", "is_multi_model": false, "max_tokens": 2048 },
    "kb": { "id": 1, "name": "Biology Textbook" }
  }
]
```

### `POST /rag-pairs`
Creates a new RAG pairing. Does not modify the agent or KB.

**Body**
```json
{ "agent_id": 1, "kb_id": 1 }
```

**Response** — same shape as a single item from `GET /rag-pairs`.

### `DELETE /rag-pairs/{id}`
Deletes the pairing. Agent and KB are unaffected.

```json
{ "ok": true }
```
