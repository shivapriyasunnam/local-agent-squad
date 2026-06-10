# Setup:
# pip install fastapi uvicorn langchain-ollama sqlalchemy psycopg2-binary pgvector langchain-postgres psycopg[binary] python-dotenv python-multipart pypdf
# Run: uvicorn server:app --reload --port 8000

from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from langchain_ollama import ChatOllama
from ollama._types import ResponseError

from db import engine, get_db
from models import Agent, RAGKnowledgeBase, Base
from rag import router as rag_router, pairs_router, get_vector_store

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.include_router(rag_router)
app.include_router(pairs_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    model: str
    message: str
    max_tokens: int = 2048
    rag_id: Optional[int] = None


class AgentCreate(BaseModel):
    is_multi_model: bool
    model: Optional[str] = None
    models: Optional[list[str]] = None
    max_tokens: Optional[int] = None
    rag_id: Optional[int] = None


class AgentUpdate(BaseModel):
    is_multi_model: bool
    model: Optional[str] = None
    models: Optional[list[str]] = None
    max_tokens: Optional[int] = None
    rag_id: Optional[int] = None


@app.post("/chat")
def chat(req: ChatRequest):
    try:
        message = req.message
        if req.rag_id:
            store = get_vector_store()
            results = store.similarity_search(req.message, k=4, filter={"rag_id": req.rag_id})
            if results:
                context = "\n---\n".join(r.page_content for r in results)
                message = f"Use the following context to answer the question:\n\n{context}\n\nQuestion: {req.message}"
        llm = ChatOllama(model=req.model, num_predict=req.max_tokens)
        response = llm.invoke(message)
        return {"reply": response.content}
    except ResponseError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Model '{req.model}' not found. Run: ollama pull {req.model}")
        raise


@app.post("/agents")
def create_agent(body: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(
        is_multi_model=body.is_multi_model,
        model=body.model,
        models=body.models,
        max_tokens=body.max_tokens,
        rag_id=body.rag_id,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@app.get("/agents")
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).order_by(Agent.created_at).all()


@app.put("/agents/{agent_id}")
def update_agent(agent_id: int, body: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_multi_model = body.is_multi_model
    agent.model = body.model
    agent.models = body.models
    agent.max_tokens = body.max_tokens
    agent.rag_id = body.rag_id
    db.commit()
    db.refresh(agent)
    return agent


@app.delete("/agents/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"ok": True}
