from sqlalchemy import Column, Integer, Boolean, String, ARRAY, DateTime, ForeignKey
from sqlalchemy.sql import func
from db import Base


class RAGKnowledgeBase(Base):
    __tablename__ = "rag_knowledge_bases"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Agent(Base):
    __tablename__ = "agents"

    id             = Column(Integer, primary_key=True, index=True)
    is_multi_model = Column(Boolean, nullable=False, default=False)
    model          = Column(String, nullable=True)
    models         = Column(ARRAY(String), nullable=True)
    max_tokens     = Column(Integer, nullable=True)
    rag_id         = Column(Integer, ForeignKey("rag_knowledge_bases.id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())


class RAGPair(Base):
    __tablename__ = "rag_pairs"

    id         = Column(Integer, primary_key=True, index=True)
    agent_id   = Column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False)
    kb_id      = Column(Integer, ForeignKey("rag_knowledge_bases.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
