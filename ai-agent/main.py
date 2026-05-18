from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn
 
from agent import MongoAIAgent, UnsafeQueryError
 
app = FastAPI(
    title="MongoDB AI Agent",
    description=(
        "A natural-language interface for MongoDB Atlas. "
        "Ask questions in plain English — get human-friendly answers."
    ),
    version="1.0.0",
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
 
# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
 
class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    conversation_id: Optional[str] = None   # future: multi-turn support

    class Config:
        extra = "forbid"
 
 
class QueryResponse(BaseModel):
    question: str
    answer: str
    query_used: Optional[dict] = None       # hidden unless the agent is in debug mode
    raw_count: Optional[int] = None         # number of documents matched
    database: str
    collection: Optional[str] = None
 
 
class HealthResponse(BaseModel):
    status: str
    mongo_connected: bool
    message: str
 
 
# ---------------------------------------------------------------------------
# Singleton agent (initialised once at startup)
# ---------------------------------------------------------------------------
 
_agent: Optional[MongoAIAgent] = None
 
 
@app.on_event("startup")
async def startup():
    global _agent
    _agent = MongoAIAgent()
    await _agent.connect()
 
 
@app.on_event("shutdown")
async def shutdown():
    if _agent:
        await _agent.close()
 
 
# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
 
@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "MongoDB AI Agent",
        "docs": "/docs",
        "health": "/health",
        "query": "POST /query",
    }
 
 
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    if _agent is None:
        return HealthResponse(
            status="error",
            mongo_connected=False,
            message="Agent not initialised yet.",
        )
    connected = await _agent.ping()
    return HealthResponse(
        status="ok" if connected else "degraded",
        mongo_connected=connected,
        message="MongoDB Atlas reachable." if connected else "Cannot reach MongoDB Atlas.",
    )
 
 
@app.get("/collections", tags=["Schema"])
async def list_collections():
    """List public collections available to the chatbot."""
    if _agent is None:
        raise HTTPException(status_code=503, detail="Agent not ready.")
    result = await _agent.list_collections()
    return result
 
 
@app.get("/schema/{collection}", tags=["Schema"])
async def collection_schema(collection: str):
    """Return the public chatbot schema for an allowed collection."""
    if _agent is None:
        raise HTTPException(status_code=503, detail="Agent not ready.")
    try:
        result = await _agent.infer_schema(collection)
    except UnsafeQueryError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return result
 
 
@app.post("/query", response_model=QueryResponse, tags=["Query"])
async def query(request: QueryRequest):
    """
    Submit a natural-language question about your MongoDB data.
    The agent will translate it into MQL, execute it, and return a
    human-friendly answer.
    """
    if _agent is None:
        raise HTTPException(status_code=503, detail="Agent not ready.")
 
    try:
        result = await _agent.ask(
            question=request.question,
        )
        return QueryResponse(**result)
    except UnsafeQueryError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
 
 
# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
 
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
