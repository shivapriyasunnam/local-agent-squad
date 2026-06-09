# Local Agent Squad

A full-stack application for spinning up and chatting with local AI agents — no API keys, no cloud, no data leaving your machine. Configure agents backed by any [Ollama](https://ollama.com) model, then chat with one or run side-by-side multi-model comparisons in a single view.

---

## Overview

Local Agent Squad gives you a clean interface for managing a personal fleet of local LLM agents. Each agent is a named configuration — a model choice plus a token budget — that you can create, edit, and delete. Click any agent card to open a full chat session, or enable multi-model mode to fan out the same prompt to several models at once and compare their responses in real time.

Everything runs on your own hardware through Ollama. The backend is a small FastAPI service; the frontend is a React 19 single-page app.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│                                                          │
│   Agent Dashboard  ──→  CreateAgentModal                 │
│         │                                                │
│         └──→  ChatView (single-model or multi-model)     │
│                    │                                     │
│                    │  POST /chat  {model, message, ...}  │
└────────────────────┼─────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   FastAPI Server    │
          │   (uvicorn :8000)   │
          │                     │
          │  ChatOllama (LC)    │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   Ollama Daemon     │
          │   (local models)    │
          └─────────────────────┘
```

The React frontend never talks to Ollama directly. All model calls go through the FastAPI layer, which uses `langchain_ollama.ChatOllama` as the inference client. This keeps model-specific concerns (response parsing, error handling, token counting) on the server side and lets the frontend stay model-agnostic.

For multi-model agents, the frontend fans out concurrent `fetch` calls — one per model — using `Promise.all`, so all models receive the prompt at the same time and render their responses independently as they arrive.

---

## Features

### Agent Management
- **Create agents** — choose a model from a rich dropdown (with capability tags, available parameter sizes, and pull counts) and set a max-token budget
- **Edit agents** — reconfigure any existing agent without losing your session context
- **Delete agents** — one click, with isolated event handling to prevent accidental triggers from card clicks

### Single-Model Chat
- Full conversation UI with user and assistant bubbles
- Animated typing indicator while the model is generating
- `Enter` to send, `Shift+Enter` for a newline
- Model name shown as a chip inside the input bar

### Multi-Model Comparison
- Toggle **multi-model mode** in the agent builder to select any combination of models
- The chat view splits into equal-width columns, one per model
- Every message is broadcast to all models simultaneously via parallel async requests
- Each column scrolls and loads independently — slower models don't block faster ones

### Supported Models (pre-configured)
| Model | Tags | Sizes |
|---|---|---|
| llama3.1 | tools | 8b, 70b, 405b |
| deepseek-r1 | tools, thinking | 1.5b → 671b |
| llama3.2 | tools | 1b, 3b |
| gemma3 | vision | 270m → 27b |
| qwen2.5 | tools | 0.5b → 72b |
| llama2 | tools | 7b, 13b, 70b |
| nomic-embed-text | embedding | — |

---

## Tech Stack

**Backend**
- [Python 3.11+](https://python.org)
- [FastAPI](https://fastapi.tiangolo.com) — async HTTP framework with automatic OpenAPI docs
- [Pydantic](https://docs.pydantic.dev) — request validation
- [LangChain Ollama](https://python.langchain.com/docs/integrations/chat/ollama/) — `ChatOllama` inference client
- [Ollama](https://ollama.com) — local model runtime

**Frontend**
- [React 19](https://react.dev) — UI with hooks (`useState`, `useRef`, `useEffect`)
- Vanilla CSS — dark theme, custom components (no component library)
- `Promise.all` for concurrent multi-model requests

---

## Getting Started

### Prerequisites

- [Ollama](https://ollama.com/download) installed and running
- Python 3.11+
- Node.js 18+

### 1. Pull a model

```bash
ollama pull llama3.2
```

Any model from the supported list above works. Smaller variants (1b, 3b) run well on most laptops.

### 2. Start the backend

```bash
cd server
pip install fastapi uvicorn langchain-ollama
uvicorn server:app --reload --port 8000
```

The server starts at `http://localhost:8000`. Interactive API docs are at `http://localhost:8000/docs`.

### 3. Start the frontend

```bash
cd web-app
npm install
npm start
```

The app opens at `http://localhost:3000`.

---

## Usage

### Creating an agent

1. Click **+ Create Agent** in the top-right corner
2. Select a model from the dropdown — each entry shows capability tags, available sizes, and community pull counts
3. Optionally set a **Max Tokens** limit to cap response length
4. Click **Build**

The agent appears as a card on the dashboard.

### Chatting

Click any agent card to open a chat session. Type a message and press `Enter` (or click ↑) to send. The model name is shown as a chip inside the input area.

### Multi-model comparison

1. Open **+ Create Agent**, then toggle **multi-model agent** on
2. Add two or more models using the **+ Add model** selector
3. Click **Build**, then open the agent
4. The view splits into columns — one per model — and your messages are sent to all of them simultaneously

---

## API Reference

### `POST /chat`

```json
{
  "model": "llama3.2",
  "message": "Explain transformers in one paragraph.",
  "max_tokens": 512
}
```

**Response**

```json
{
  "reply": "..."
}
```

**Error (model not pulled)**

```json
{
  "detail": "Model 'llama3.2' not found. Run: ollama pull llama3.2"
}
```

The server returns a 404 with a copy-pasteable `ollama pull` command when the requested model isn't available locally.

---

## Project Structure

```
local-agent-squad/
├── server/
│   └── server.py          # FastAPI app — single /chat endpoint
└── web-app/
    └── src/
        ├── App.js          # All UI: dashboard, modals, chat view
        └── App.css         # Dark theme styling
```

---

## Design Decisions

**Why FastAPI over calling Ollama directly from the browser?**
Browsers can't make raw TCP connections to Ollama's API in a way that's CORS-safe and model-agnostic. The thin FastAPI layer solves CORS, centralises error handling (the 404 → "run ollama pull" message), and keeps the frontend decoupled from the Ollama HTTP contract.

**Why `Promise.all` for multi-model?**
Each model can take a different amount of time. Firing requests in parallel means a fast 1b model responds without waiting for a 70b model to finish. Columns render and load independently, which is the correct UX for a comparison tool.

**Why no component library?**
The entire UI is hand-rolled CSS. This keeps the bundle small and means every visual decision is explicit and easy to change.

---

## License

MIT
