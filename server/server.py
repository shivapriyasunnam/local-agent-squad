# Setup:
# pip install fastapi uvicorn langchain-ollama
# Run: uvicorn server:app --reload --port 8000

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_ollama import ChatOllama
from ollama._types import ResponseError

app = FastAPI()

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

@app.post("/chat")
def chat(req: ChatRequest):
    try:
        llm = ChatOllama(model=req.model, num_predict=req.max_tokens)
        response = llm.invoke(req.message)
        return {"reply": response.content}
    except ResponseError as e:
        if e.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Model '{req.model}' not found. Run: ollama pull {req.model}")
        raise
