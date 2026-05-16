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
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# How many sample documents to use when inferring a collection schema
SCHEMA_SAMPLE_SIZE: int = 10
# Maximum documents to fetch for query results (safety cap)
RESULT_LIMIT: int = 50
PRODUCT_QUERY_LIMIT: int = 5

# Low-cardinality fields where model-generated values should be reconciled
# against the database before querying. MongoDB string equality is case-sensitive.
NORMALIZED_VALUE_FIELDS = {"category", "subCategory", "status", "role", "provider"}
PRODUCT_COLLECTION_NAMES = {"product", "products"}
PRODUCT_NAME_MATCH_LIMIT = 500
NARRATION_OMITTED_FIELDS = {"image", "images", "comments"}
GENERIC_PRODUCT_NAME_TOKENS = {
    "active",
    "black",
    "camera",
    "desktop",
    "gaming",
    "laptop",
    "phone",
    "silver",
    "tablet",
    "white",
}

VALUE_ALIASES = {
    "category": {
        "phone": "Phone",
        "phones": "Phone",
        "laptop": "Laptop",
        "laptops": "Laptop",
        "accessory": "Accessory",
        "accessories": "Accessory",
        "wearable": "Wearable",
        "wearables": "Wearable",
        "camera": "Camera",
        "cameras": "Camera",
        "tablet": "Tablet",
        "tablets": "Tablet",
        "pc": "PC",
        "pcs": "PC",
        "computer": "PC",
        "computers": "PC",
        "audio": "Audio",
        "gaming": "Gaming",
    },
}

PRODUCT_TYPE_ALIASES = {
    "laptop": ("laptop", "laptops"),
    "phone": ("phone", "phones", "smartphone", "smartphones"),
    "tablet": ("tablet", "tablets"),
    "camera": ("camera", "cameras"),
    "wearable": ("wearable", "wearables", "watch", "watches"),
    "accessory": ("accessory", "accessories"),
    "audio": ("audio", "headphone", "headphones", "speaker", "speakers"),
    "pc": ("pc", "pcs", "desktop", "desktops", "computer", "computers"),
}

PRODUCT_TYPE_CATEGORY = {
    "laptop": "Laptop",
    "phone": "Phone",
    "tablet": "Tablet",
    "camera": "Camera",
    "wearable": "Wearable",
    "accessory": "Accessory",
    "audio": "Audio",
    "pc": "PC",
}

USAGE_ALIASES = {
    "gaming": ("gaming", "game", "games", "gamer", "gamers"),
}

USAGE_CATEGORY = {
    "gaming": "Gaming",
}


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


def _normalise_lookup_key(value: Any) -> str:
    return str(value).strip().casefold()


def _normalise_search_text(value: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(value).casefold())).strip()


def _product_name_match_score(question: str, product_name: str) -> int:
    normalized_question = _normalise_search_text(question)
    normalized_name = _normalise_search_text(product_name)

    if not normalized_question or not normalized_name:
        return 0

    if normalized_name in normalized_question:
        return 1000 + len(normalized_name)

    tokens = [token for token in normalized_name.split() if token]

    if len(tokens) >= 2:
        first_pair = " ".join(tokens[:2])
        if first_pair in normalized_question:
            return 500 + len(first_pair)

    strong_tokens = [
        token
        for token in tokens
        if token not in GENERIC_PRODUCT_NAME_TOKENS
        and (len(token) >= 5 or any(char.isdigit() for char in token))
    ]
    matched_tokens = [token for token in strong_tokens if token in normalized_question]

    if matched_tokens:
        return 100 + sum(len(token) for token in matched_tokens)

    return 0


def _requested_product_type(question: str) -> Optional[str]:
    normalized_question = f" {_normalise_search_text(question)} "

    for product_type, aliases in PRODUCT_TYPE_ALIASES.items():
        if any(f" {alias} " in normalized_question for alias in aliases):
            return product_type

    return None


def _requested_usage(question: str) -> Optional[str]:
    normalized_question = f" {_normalise_search_text(question)} "

    for usage, aliases in USAGE_ALIASES.items():
        if any(f" {alias} " in normalized_question for alias in aliases):
            return usage

    return None


def _category_or_identity_filter(category: str, aliases: tuple[str, ...]) -> dict:
    pattern = r"\b(?:" + "|".join(re.escape(alias) for alias in aliases) + r")\b"

    return {
        "$or": [
            {"category": category},
            {"tags": category},
            {"subCategory": {"$regex": pattern, "$options": "i"}},
            {"name": {"$regex": pattern, "$options": "i"}},
        ]
    }


def _product_intent_filter(question: str) -> Optional[dict]:
    product_type = _requested_product_type(question)
    usage = _requested_usage(question)
    filters = []

    if product_type:
        filters.append(
            _category_or_identity_filter(
                PRODUCT_TYPE_CATEGORY[product_type],
                PRODUCT_TYPE_ALIASES[product_type],
            )
        )

    if usage:
        filters.append(
            _category_or_identity_filter(
                USAGE_CATEGORY[usage],
                USAGE_ALIASES[usage],
            )
        )

    if not filters:
        return None

    if len(filters) == 1:
        return filters[0]

    return {"$and": filters}


def _price_filter(question: str) -> Optional[dict]:
    normalized_question = _normalise_search_text(question)
    match = re.search(r"(?:\$|usd\s*)?(\d{2,6})(?:\s*(?:usd|dollars?))?", normalized_question)

    if not match:
        return None

    price = int(match.group(1))
    if price <= 0:
        return None

    if re.search(r"\b(around|arounds|about|approximately|approx|near)\b", normalized_question):
        lower = round(price * 0.9, 2)
        upper = round(price * 1.1, 2)
        return {"price": {"$gte": lower, "$lte": upper}}

    if re.search(r"\b(under|below|less than|max|maximum|up to)\b", normalized_question):
        return {"price": {"$lte": price}}

    if re.search(r"\b(over|above|more than|min|minimum|at least)\b", normalized_question):
        return {"price": {"$gte": price}}

    return {"price": {"$lte": price}}


def _merge_match_filter(existing_filter: Any, required_filter: Optional[dict]) -> Any:
    if not required_filter:
        return existing_filter

    if not isinstance(existing_filter, dict) or not existing_filter:
        return required_filter

    if "$and" in existing_filter and isinstance(existing_filter["$and"], list):
        return {**existing_filter, "$and": [*existing_filter["$and"], required_filter]}

    return {"$and": [existing_filter, required_filter]}


def _product_query_filter(question: str) -> Optional[dict]:
    intent_filter = _product_intent_filter(question)

    if not intent_filter:
        return None

    return _merge_match_filter(intent_filter, _price_filter(question))


def _strip_narration_fields(value: Any) -> Any:
    if isinstance(value, list):
        return [_strip_narration_fields(item) for item in value]

    if isinstance(value, dict):
        return {
            key: _strip_narration_fields(item)
            for key, item in value.items()
            if key not in NARRATION_OMITTED_FIELDS
        }

    return value


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

    async def _product_collection_name(self, database: Optional[str] = None) -> Optional[str]:
        names = await self._db(database).list_collection_names()
        lookup = {name.casefold(): name for name in names}

        for candidate in ("product", "products"):
            if candidate in lookup:
                return lookup[candidate]

        return None

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
            distinct_lines = []
            for field in sorted(NORMALIZED_VALUE_FIELDS & set(info["inferred_schema"])):
                values = await db[name].distinct(field)
                values = [value for value in values if value not in (None, "")]
                if values and len(values) <= 25:
                    distinct_lines.append(
                        f"{field} values: {json.dumps(sorted(values), default=str)}"
                    )
            if distinct_lines:
                lines.append(f"    Allowed values: {'; '.join(distinct_lines)}")
        return "\n".join(lines)

    async def _normalise_filter_values(self, collection: str, filt: Any, database: Optional[str] = None) -> Any:
        """Reconcile model-generated exact-match values with actual DB casing."""
        if isinstance(filt, list):
            return [
                await self._normalise_filter_values(collection, item, database)
                for item in filt
            ]

        if not isinstance(filt, dict):
            return filt

        db = self._db(database)
        normalised = {}

        for key, value in filt.items():
            if key in ("$and", "$or", "$nor") and isinstance(value, list):
                normalised[key] = [
                    await self._normalise_filter_values(collection, item, database)
                    for item in value
                ]
                continue

            field_name = key.split(".")[-1]
            if field_name in NORMALIZED_VALUE_FIELDS:
                normalised[key] = await self._normalise_field_value(
                    db[collection],
                    field_name,
                    value,
                )
            elif isinstance(value, dict):
                normalised[key] = await self._normalise_filter_values(
                    collection,
                    value,
                    database,
                )
            else:
                normalised[key] = value

        return normalised

    async def _normalise_field_value(self, col, field: str, value: Any) -> Any:
        if isinstance(value, str):
            return await self._match_distinct_value(col, field, value)

        if isinstance(value, list):
            return [
                await self._normalise_field_value(col, field, item)
                for item in value
            ]

        if isinstance(value, dict):
            normalised = {}
            for op, op_value in value.items():
                if op in ("$eq", "$ne") and isinstance(op_value, str):
                    normalised[op] = await self._match_distinct_value(col, field, op_value)
                elif op in ("$in", "$nin") and isinstance(op_value, list):
                    normalised[op] = [
                        await self._match_distinct_value(col, field, item)
                        if isinstance(item, str)
                        else item
                        for item in op_value
                    ]
                else:
                    normalised[op] = op_value
            return normalised

        return value

    async def _match_distinct_value(self, col, field: str, value: str) -> str:
        alias = VALUE_ALIASES.get(field, {}).get(_normalise_lookup_key(value))
        if alias:
            return alias

        distinct_values = await col.distinct(field)
        lookup = {
            _normalise_lookup_key(item): item
            for item in distinct_values
            if item not in (None, "")
        }

        key = _normalise_lookup_key(value)
        if key in lookup:
            return lookup[key]

        singular_key = key[:-1] if key.endswith("s") else key
        if singular_key in lookup:
            return lookup[singular_key]

        return value

    async def _match_named_product(
        self,
        collection: str,
        question: str,
        database: Optional[str] = None,
    ) -> Optional[str]:
        if collection.casefold() not in PRODUCT_COLLECTION_NAMES:
            return None

        col = self._db(database)[collection]
        cursor = col.find(
            {"name": {"$type": "string"}},
            {"_id": 0, "name": 1},
        ).limit(PRODUCT_NAME_MATCH_LIMIT)
        docs = await cursor.to_list(length=PRODUCT_NAME_MATCH_LIMIT)

        matches = [
            (doc["name"], _product_name_match_score(question, doc.get("name", "")))
            for doc in docs
            if doc.get("name")
        ]
        matches = [(name, score) for name, score in matches if score > 0]

        if not matches:
            return None

        return sorted(matches, key=lambda item: item[1], reverse=True)[0][0]

    async def _normalise_pipeline_values(
        self,
        collection: str,
        pipeline: list[dict],
        database: Optional[str] = None,
    ) -> list[dict]:
        normalised_pipeline = []
        for stage in pipeline:
            if "$match" in stage and isinstance(stage["$match"], dict):
                normalised_stage = {
                    **stage,
                    "$match": await self._normalise_filter_values(
                        collection,
                        stage["$match"],
                        database,
                    ),
                }
                normalised_pipeline.append(normalised_stage)
            else:
                normalised_pipeline.append(stage)
        return normalised_pipeline

    def _apply_product_intent_constraint(
        self,
        plan: dict,
        question: str,
        operation: str,
        collection: str,
    ) -> dict:
        if collection.casefold() not in PRODUCT_COLLECTION_NAMES:
            return plan

        required_filter = _product_intent_filter(question)
        if not required_filter:
            return plan

        constrained_plan = {**plan}

        if operation in ("find", "count", "distinct"):
            constrained_plan["filter"] = _merge_match_filter(
                constrained_plan.get("filter", {}),
                required_filter,
            )
            return constrained_plan

        if operation == "aggregate":
            pipeline = list(constrained_plan.get("pipeline", []))
            if pipeline and "$match" in pipeline[0] and isinstance(pipeline[0]["$match"], dict):
                pipeline[0] = {
                    **pipeline[0],
                    "$match": _merge_match_filter(pipeline[0]["$match"], required_filter),
                }
            else:
                pipeline.insert(0, {"$match": required_filter})
            constrained_plan["pipeline"] = pipeline

        return constrained_plan

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
            "For find operations always include limit <= 50 unless user asks for all records.\n"
            "When the user asks about a named product, filter by the product name and set limit to 1. "
            "Do not return other products from the same category unless the user explicitly asks for alternatives, comparisons, or recommendations. "
            "Treat words like laptop, accessory, phone, tablet, audio, camera, and PC as product types. "
            "Treat words like gaming as qualifiers, not standalone product types. "
            "For compound requests such as gaming laptop or gaming accessories, the query must require both the product type and the qualifier."
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
            "If the user asked about one named product, answer only about that product. "
            "Do not include images, markdown image syntax, or raw image URLs. "
            "If the result is a number, say what it represents. "
            "Never expose internal MongoDB field names like _id unless relevant. "
            "Keep the answer under 300 words."
        )
        # Truncate very large result sets for the prompt
        display_results = _strip_narration_fields(results[:20])
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
        product_query_filter = _product_query_filter(question)
        product_collection_name = await self._product_collection_name(database)

        if product_query_filter and product_collection_name:
            plan = {
                "collection": product_collection_name,
                "operation": "find",
                "filter": product_query_filter,
                "projection": {"_id": 0},
                "sort": {"price": 1},
                "limit": PRODUCT_QUERY_LIMIT,
            }
            col = db[product_collection_name]
            filt = await self._normalise_filter_values(
                product_collection_name,
                plan["filter"],
                database,
            )
            plan["filter"] = filt
            cursor = col.find(filt, plan["projection"]).sort(list(plan["sort"].items())).limit(plan["limit"])
            results = await cursor.to_list(length=plan["limit"])
            answer = self._narrate_results(question, plan, results, len(results))

            return {
                "question": question,
                "answer": answer,
                "query_used": plan,
                "raw_count": len(results),
                "database": db.name,
                "collection": product_collection_name,
            }

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

        matched_product_name = await self._match_named_product(
            collection_name,
            question,
            database,
        )
        if matched_product_name and operation in ("find", "aggregate"):
            operation = "find"
            plan = {
                "collection": collection_name,
                "operation": "find",
                "filter": {
                    "name": {
                        "$regex": f"^{re.escape(matched_product_name)}$",
                        "$options": "i",
                    },
                },
                "projection": plan.get("projection") or {"_id": 0},
                "sort": {},
                "limit": 1,
            }
        elif operation in ("find", "aggregate", "count", "distinct"):
            plan = self._apply_product_intent_constraint(
                plan,
                question,
                operation,
                collection_name,
            )

        # 3. Execute query
        results: list[Any] = []
        try:
            if operation == "count":
                filt = plan.get("filter", {})
                filt = await self._normalise_filter_values(collection_name, filt, database)
                plan["filter"] = filt
                count = await col.count_documents(filt)
                results = [{"count": count}]

            elif operation == "distinct":
                field = plan.get("field", "")
                filt = plan.get("filter", {})
                filt = await self._normalise_filter_values(collection_name, filt, database)
                plan["filter"] = filt
                results = await col.distinct(field, filt)
                results = [{"values": results}]

            elif operation == "aggregate":
                pipeline = plan.get("pipeline", [])
                pipeline = await self._normalise_pipeline_values(
                    collection_name,
                    pipeline,
                    database,
                )
                # Safety: add a $limit stage if none present
                has_limit = any("$limit" in stage for stage in pipeline)
                if not has_limit:
                    pipeline.append({"$limit": RESULT_LIMIT})
                plan["pipeline"] = pipeline
                cursor = col.aggregate(pipeline)
                results = await cursor.to_list(length=RESULT_LIMIT)

            else:  # find (default)
                filt = plan.get("filter", {})
                filt = await self._normalise_filter_values(collection_name, filt, database)
                plan["filter"] = filt
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
