# API Reference

Base URL: `http://localhost:8000`

---

## Agents

### `GET /agents`
Returns all saved agents ordered by creation time.

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

---

### `POST /agents`
Creates a new agent.

**Body**
```json
{
  "is_multi_model": false,
  "model": "llama3.1",
  "models": null,
  "max_tokens": 2048
}
```

For a multi-model agent:
```json
{
  "is_multi_model": true,
  "model": null,
  "models": ["llama3.1", "deepseek-r1"],
  "max_tokens": 1024
}
```

**Response** — the created agent object with its assigned `id`.

---

### `PUT /agents/{id}`
Updates an existing agent.

**Body** — same shape as `POST /agents`.

**Response** — the updated agent object.

---

### `DELETE /agents/{id}`
Deletes an agent.

**Response**
```json
{ "ok": true }
```

---

## Chat

### `POST /chat`
Sends a message to a model and returns its response.

**Body**
```json
{
  "model": "llama3.1",
  "message": "Hello!",
  "max_tokens": 2048
}
```

**Response**
```json
{ "reply": "Hello! How can I help you?" }
```

**Errors**
- `404` — model not found locally. Fix: `ollama pull <model>`
