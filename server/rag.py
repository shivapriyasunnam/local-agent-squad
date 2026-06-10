import io
import os
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError
from langchain_postgres import PGEngine, PGVectorStore
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

from db import get_db
from models import RAGKnowledgeBase, RAGPair, Agent

load_dotenv()

_raw_url = os.getenv("DATABASE_URL", "postgresql://agent@localhost:5432/agentsquad")
PSYCOPG_URL = _raw_url.replace("postgresql://", "postgresql+psycopg://", 1)

VECTOR_TABLE = "rag_chunks"
EMBED_BATCH_SIZE = 10  # nomic-embed-text llama-server starts with -c 2048; batching prevents token overflow

_pg_engine = PGEngine.from_connection_string(PSYCOPG_URL)
try:
    _pg_engine.init_vectorstore_table(VECTOR_TABLE, vector_size=768, overwrite_existing=False)
except ProgrammingError:
    pass  # table already exists

_embeddings = OllamaEmbeddings(model="nomic-embed-text")


def get_vector_store() -> PGVectorStore:
    return PGVectorStore.create_sync(
        engine=_pg_engine,
        embedding_service=_embeddings,
        table_name=VECTOR_TABLE,
    )


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    chunks, start = [], 0
    text = text.strip()
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return [c for c in chunks if c.strip()]


router = APIRouter(prefix="/rags", tags=["rag"])


class RAGCreate(BaseModel):
    name: str


class IngestRequest(BaseModel):
    text: str


class QueryRequest(BaseModel):
    query: str
    k: int = 4


@router.post("")
def create_rag(body: RAGCreate, db: Session = Depends(get_db)):
    rag = RAGKnowledgeBase(name=body.name)
    db.add(rag)
    db.commit()
    db.refresh(rag)
    return rag


@router.get("")
def list_rags(db: Session = Depends(get_db)):
    return db.query(RAGKnowledgeBase).order_by(RAGKnowledgeBase.created_at).all()


@router.delete("/{rag_id}")
def delete_rag(rag_id: int, db: Session = Depends(get_db)):
    rag = db.query(RAGKnowledgeBase).filter(RAGKnowledgeBase.id == rag_id).first()
    if not rag:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    store = get_vector_store()
    store.delete(filter={"rag_id": rag_id})
    db.delete(rag)
    db.commit()
    return {"ok": True}


@router.post("/{rag_id}/ingest")
def ingest(rag_id: int, body: IngestRequest, db: Session = Depends(get_db)):
    rag = db.query(RAGKnowledgeBase).filter(RAGKnowledgeBase.id == rag_id).first()
    if not rag:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    chunks = chunk_text(body.text)
    docs = [Document(page_content=chunk, metadata={"rag_id": rag_id}) for chunk in chunks]
    store = get_vector_store()
    for i in range(0, len(docs), EMBED_BATCH_SIZE):
        store.add_documents(docs[i:i + EMBED_BATCH_SIZE])
    return {"chunks_added": len(docs)}


@router.post("/{rag_id}/ingest-file")
def ingest_file(rag_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    rag = db.query(RAGKnowledgeBase).filter(RAGKnowledgeBase.id == rag_id).first()
    if not rag:
        raise HTTPException(status_code=404, detail="Knowledge base not found")

    filename = file.filename or ""
    content = file.file.read()

    if filename.lower().endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except ImportError:
            raise HTTPException(status_code=422, detail="PDF support requires pypdf: pip install pypdf")
    else:
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=422, detail="File must be a UTF-8 text or PDF file")

    if not text.strip():
        raise HTTPException(status_code=422, detail="No text could be extracted from the file")

    chunks = chunk_text(text)
    docs = [Document(page_content=chunk, metadata={"rag_id": rag_id}) for chunk in chunks]
    store = get_vector_store()
    for i in range(0, len(docs), EMBED_BATCH_SIZE):
        store.add_documents(docs[i:i + EMBED_BATCH_SIZE])
    return {"chunks_added": len(docs), "filename": filename}


@router.post("/{rag_id}/query")
def query_rag(rag_id: int, body: QueryRequest, db: Session = Depends(get_db)):
    rag = db.query(RAGKnowledgeBase).filter(RAGKnowledgeBase.id == rag_id).first()
    if not rag:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    store = get_vector_store()
    results = store.similarity_search(body.query, k=body.k, filter={"rag_id": rag_id})
    return [{"content": r.page_content, "metadata": r.metadata} for r in results]


# --- RAG Pairs (agent + KB combinations) ---

pairs_router = APIRouter(prefix="/rag-pairs", tags=["rag-pairs"])


class RAGPairCreate(BaseModel):
    agent_id: int
    kb_id: int


@pairs_router.post("")
def create_rag_pair(body: RAGPairCreate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == body.agent_id).first()
    kb = db.query(RAGKnowledgeBase).filter(RAGKnowledgeBase.id == body.kb_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    pair = RAGPair(agent_id=body.agent_id, kb_id=body.kb_id)
    db.add(pair)
    db.commit()
    db.refresh(pair)
    return {
        "id": pair.id,
        "agent_id": pair.agent_id,
        "kb_id": pair.kb_id,
        "created_at": pair.created_at,
        "agent": {"id": agent.id, "model": agent.model, "models": agent.models,
                  "is_multi_model": agent.is_multi_model, "max_tokens": agent.max_tokens},
        "kb": {"id": kb.id, "name": kb.name},
    }


@pairs_router.get("")
def list_rag_pairs(db: Session = Depends(get_db)):
    pairs = db.query(RAGPair).order_by(RAGPair.created_at).all()
    result = []
    for pair in pairs:
        agent = db.query(Agent).filter(Agent.id == pair.agent_id).first()
        kb = db.query(RAGKnowledgeBase).filter(RAGKnowledgeBase.id == pair.kb_id).first()
        if agent and kb:
            result.append({
                "id": pair.id,
                "agent_id": pair.agent_id,
                "kb_id": pair.kb_id,
                "created_at": pair.created_at,
                "agent": {"id": agent.id, "model": agent.model, "models": agent.models,
                          "is_multi_model": agent.is_multi_model, "max_tokens": agent.max_tokens},
                "kb": {"id": kb.id, "name": kb.name},
            })
    return result


@pairs_router.delete("/{pair_id}")
def delete_rag_pair(pair_id: int, db: Session = Depends(get_db)):
    pair = db.query(RAGPair).filter(RAGPair.id == pair_id).first()
    if not pair:
        raise HTTPException(status_code=404, detail="RAG not found")
    db.delete(pair)
    db.commit()
    return {"ok": True}
