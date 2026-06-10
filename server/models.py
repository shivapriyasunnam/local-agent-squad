from sqlalchemy import Column, Integer, Boolean, String, ARRAY, DateTime
from sqlalchemy.sql import func
from db import Base


class Agent(Base):
    __tablename__ = "agents"

    id             = Column(Integer, primary_key=True, index=True)
    is_multi_model = Column(Boolean, nullable=False, default=False)
    model          = Column(String, nullable=True)
    models         = Column(ARRAY(String), nullable=True)
    max_tokens     = Column(Integer, nullable=True)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())
