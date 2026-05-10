"""
MongoAIAgent
============
Translates natural-language questions into MongoDB Query Language (MQL),
executes them against Atlas, and returns human-friendly answers — all powered
by OpenAI GPT via the OpenAI API.

Flow
----
1. List collections + infer schema for the target database.
2. Ask GPT to produce a structured MQL plan (collection + pipeline/filter).
3. Execute the query with Motor (async PyMongo).
4. Ask GPT to narrate the results in plain English.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

from openai import OpenAI
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------

MONGODB_URI: str = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority",
)
DEFAULT_DB: str = os.getenv("DB_NAME", "products")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4.1-nano")

# How many sample documents to use when inferring a collection schema
SCHEMA_SAMPLE_SIZE: int = 10
# Maximum documents to fetch for query results (safety cap)
RESULT_LIMIT: int = 50


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_json(text: str) -> Any:
    """
    Pull the first JSON object/array out of a string that may contain
    markdown fences or prose around it.
    """
    # Try to find ```json ... ``` block first
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return json.loads(fence.group(1).strip())

    # Fall back: find first { or [ and parse from there
    for start_char, end_char in [('{', '}'), ('[', ']')]:
        idx = text.find(start_char)
        if idx != -1:
            # Walk forward to find matching close
            depth = 0
            for i, ch in enumerate(text[idx:], start=idx):
                if ch == start_char:
                    depth += 1
                elif ch == end_char:
                    depth -= 1
                    if depth == 0:
                        return json.loads(text[idx:i + 1])

    raise ValueError(f"No JSON found in model output:\n{text}")


def _infer_type(value: Any) -> str:
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "string"
    if isinstance(value, list):
        return "array"
    if isinstance(value, dict):
        return "object"
    return type(value).__name__


def _build_schema_from_docs(docs: list[dict]) -> dict[str, str]:
    """Merge field→type info across sample documents."""
    schema: dict[str, str] = {}
    for doc in docs:
        for key, val in doc.items():
            if key not in schema:
                schema[key] = _infer_type(val)
    return schema


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class MongoAIAgent:
    """Async AI agent that answers natural-language questions about MongoDB."""

    def __init__(self):
        self._client: Optional[AsyncIOMotorClient] = None
        self._openai = OpenAI(api_key=OPENAI_API_KEY)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def connect(self):
        self._client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)

    async def close(self):
        if self._client:
            self._client.close()

    async def ping(self) -> bool:
        try:
            await self._client.admin.command("ping")
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Schema helpers
    # ------------------------------------------------------------------

    def _db(self, database: Optional[str] = None):
        return self._client[database or DEFAULT_DB]

    async def list_collections(self, database: Optional[str] = None) -> dict:
        db = self._db(database)
        names = await db.list_collection_names()
        return {"database": db.name, "collections": names}

    async def infer_schema(
        self,
        collection: str,
        database: Optional[str] = None,
    ) -> dict:
        db = self._db(database)
        cursor = db[collection].find({}, {"_id": 0}).limit(SCHEMA_SAMPLE_SIZE)
        docs = await cursor.to_list(length=SCHEMA_SAMPLE_SIZE)
        schema = _build_schema_from_docs(docs)
        return {
            "database": db.name,
            "collection": collection,
            "inferred_schema": schema,
            "sample_size": len(docs),
        }

    async def _full_schema_context(self, database: Optional[str] = None) -> str:
        """
        Build a compact text description of every collection + its fields.
        This is injected into the Claude prompt so it can generate accurate MQL.
        """
        db = self._db(database)
        names = await db.list_collection_names()
        lines = [f"Database: {db.name}", "Collections and their fields:"]
        for name in names:
            info = await self.infer_schema(name, database)
            fields = ", ".join(
                f"{k} ({v})" for k, v in info["inferred_schema"].items()
            )
            lines.append(f"  • {name}: {fields or '(empty)'}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # OpenAI calls
    # ------------------------------------------------------------------

    def _chat(self, system: str, user: str, max_tokens: int = 1024) -> str:
        response = self._openai.chat.completions.create(
            model=OPENAI_MODEL,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
        )
        return response.choices[0].message.content

    def _plan_query(self, question: str, schema_context: str) -> dict:
        """
        Ask Claude to produce a MQL plan as JSON:
        {
          "collection": "<name>",
          "operation": "find" | "aggregate" | "count" | "distinct",
          "filter": {...},           // for find / count
          "pipeline": [...],         // for aggregate
          "field": "<name>",         // for distinct
          "projection": {...},       // optional, for find
          "sort": {...},             // optional, for find
          "limit": <int>             // optional, for find
        }
        """
        system = (
            "You are an expert MongoDB query planner. "
            "Output ONLY a single valid JSON object — no prose, no markdown fences.\n\n"
            "The JSON object MUST always contain exactly these two top-level keys:\n"
            "  \"collection\": the exact collection name from the schema\n"
            "  \"operation\": one of find | aggregate | count | distinct\n\n"
            "Never use \"aggregate\" as a top-level key. Always use \"collection\".\n\n"
            "Additional keys by operation:\n"
            "  find      -> filter ({}), projection ({\"_id\":0}), sort ({}), limit (int)\n"
            "  aggregate -> pipeline ([...stages]) — always include a $limit stage <= 50\n"
            "  count     -> filter ({})\n"
            "  distinct  -> field (str), filter ({})\n\n"
            "For find operations always include limit <= 50 unless user asks for all records."
        )
        user = (
            f"{schema_context}\n\n"
            f"Question: {question}\n\n"
            "Return the JSON query plan only. "
            "Top-level keys must be \"collection\", \"operation\", and operation-specific keys."
        )
        raw = self._chat(system, user)
        return _extract_json(raw)

    def _narrate_results(
        self,
        question: str,
        plan: dict,
        results: list[Any],
        count: int,
    ) -> str:
        """Ask Claude to turn raw query results into a friendly English answer."""
        system = (
            "You are a helpful data analyst assistant. "
            "Given the user's original question, the MongoDB query that was run, "
            "and the results returned, write a clear, concise, human-friendly answer. "
            "Use bullet points or a short table when listing multiple items. "
            "If the result is a number, say what it represents. "
            "Never expose internal MongoDB field names like _id unless relevant. "
            "Keep the answer under 300 words."
        )
        # Truncate very large result sets for the prompt
        display_results = results[:20]
        user = (
            f"Question: {question}\n\n"
            f"Query executed:\n{json.dumps(plan, indent=2, default=str)}\n\n"
            f"Results ({count} document(s) total, showing up to 20):\n"
            f"{json.dumps(display_results, indent=2, default=str)}\n\n"
            "Please answer the user's question based on these results."
        )
        return self._chat(system, user, max_tokens=600)

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def ask(
        self,
        question: str,
        database: Optional[str] = None,
    ) -> dict:
        db = self._db(database)

        # 1. Build schema context
        schema_context = await self._full_schema_context(database)

        # 2. Plan the query
        plan = self._plan_query(question, schema_context)
        operation = plan.get("operation", "find")

        # Normalise: GPT sometimes returns {"aggregate": "col", "pipeline": [...]}
        # instead of {"collection": "col", "operation": "aggregate", "pipeline": [...]}
        collection_name = plan.get("collection", "")
        if not collection_name:
            # Try common GPT mis-keys
            for alt_key in ("aggregate", "find", "count", "distinct"):
                val = plan.get(alt_key)
                if isinstance(val, str) and val:
                    collection_name = val
                    if not plan.get("operation"):
                        plan["operation"] = alt_key
                    plan["collection"] = collection_name
                    operation = plan["operation"]
                    break

        if not collection_name:
            return {
                "question": question,
                "answer": "I couldn't determine which collection to query. Please rephrase your question.",
                "query_used": plan,
                "raw_count": 0,
                "database": db.name,
                "collection": None,
            }

        col = db[collection_name]

        # 3. Execute query
        results: list[Any] = []
        try:
            if operation == "count":
                filt = plan.get("filter", {})
                count = await col.count_documents(filt)
                results = [{"count": count}]

            elif operation == "distinct":
                field = plan.get("field", "")
                filt = plan.get("filter", {})
                results = await col.distinct(field, filt)
                results = [{"values": results}]

            elif operation == "aggregate":
                pipeline = plan.get("pipeline", [])
                # Safety: add a $limit stage if none present
                has_limit = any("$limit" in stage for stage in pipeline)
                if not has_limit:
                    pipeline.append({"$limit": RESULT_LIMIT})
                cursor = col.aggregate(pipeline)
                results = await cursor.to_list(length=RESULT_LIMIT)

            else:  # find (default)
                filt = plan.get("filter", {})
                projection = plan.get("projection") or {"_id": 0}
                sort = plan.get("sort")
                limit = min(plan.get("limit", RESULT_LIMIT), RESULT_LIMIT)

                cursor = col.find(filt, projection)
                if sort:
                    sort_list = list(sort.items())
                    cursor = cursor.sort(sort_list)
                cursor = cursor.limit(limit)
                results = await cursor.to_list(length=limit)

        except Exception as exc:
            return {
                "question": question,
                "answer": f"Query execution failed: {exc}",
                "query_used": plan,
                "raw_count": 0,
                "database": db.name,
                "collection": collection_name,
            }

        count = len(results)

        # 4. Narrate results
        answer = self._narrate_results(question, plan, results, count)

        return {
            "question": question,
            "answer": answer,
            "query_used": plan,
            "raw_count": count,
            "database": db.name,
            "collection": collection_name,
        }