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


# ── Schemas ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    answer: str


class IngestRequest(BaseModel):
    product: dict  # full product document sent from Express


class DeleteRequest(BaseModel):
    product_id: str = Field(..., min_length=1)


# ── Lazy loaders ─────────────────────────────────────────────────────────────

@lru_cache
def get_conversational_chain():
    from memory_chain import conversational_chain
    return conversational_chain


# ── Routes ───────────────────────────────────────────────────────────────────

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


@app.post("/ingest", status_code=200)
def ingest_or_update(request: IngestRequest):
    """
    Called by Express on product CREATE or UPDATE.
    Deletes the old vector (if exists) and inserts a fresh one.
    Safe to call for both new and existing products.
    """
    from ingest import update_one
    try:
        update_one(request.product)
        return {"ok": True, "message": "Product vector upserted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/ingest", status_code=200)
def delete_vector(request: DeleteRequest):
    """
    Called by Express on product DELETE.
    Removes the matching vector document from product_vector.
    """
    from ingest import delete_one
    try:
        delete_one(request.product_id)
        return {"ok": True, "message": f"Vector deleted for product_id: {request.product_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))