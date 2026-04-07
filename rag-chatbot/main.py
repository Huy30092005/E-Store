import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


def get_allowed_origins() -> list[str]:
    origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


app = FastAPI(title="SimTech RAG Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    answer: str


@lru_cache
def get_conversational_chain():
    # Delay expensive dependency setup until the first real chat request.
    from memory_chain import conversational_chain

    return conversational_chain


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    message = request.message.strip()
    session_id = request.session_id.strip()

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID cannot be empty.")

    answer = get_conversational_chain().invoke(
        {"question": message},
        config={"configurable": {"session_id": session_id}},
    )
    return ChatResponse(answer=answer)
