"""
MongoAIAgent
============
Translates natural-language questions into MongoDB Query Language (MQL),
executes them against Atlas, and returns human-friendly answers — all powered
by OpenAI GPT via the OpenAI API.

Flow
----
1. List collections + infer schema for the target database.
2. Ask GPT to produce a structured, product-only MQL plan.
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
PUBLIC_DATABASE_LABEL = "public_product_catalog"

# How many sample documents to use when inferring a collection schema
SCHEMA_SAMPLE_SIZE: int = 10
# Maximum documents to fetch for query results (safety cap)
RESULT_LIMIT: int = 50
PRODUCT_QUERY_LIMIT: int = 5
MAX_QUESTION_LENGTH: int = int(os.getenv("MAX_CHATBOT_QUESTION_LENGTH", "500"))
EXPOSE_QUERY_PLAN: bool = os.getenv("EXPOSE_QUERY_PLAN", "false").lower() == "true"
ALLOW_DATABASE_OVERRIDE: bool = os.getenv("ALLOW_CHATBOT_DATABASE_OVERRIDE", "false").lower() == "true"

SAFE_REFUSAL_MESSAGE = (
    "I can only help with public product catalog information. "
    "I can't access customer, order, credential, or internal database data."
)

# Low-cardinality fields where model-generated values should be reconciled
# against the database before querying. MongoDB string equality is case-sensitive.
NORMALIZED_VALUE_FIELDS = {"category", "subCategory", "status", "tags"}
PRODUCT_COLLECTION_NAMES = {"product", "products"}
PRODUCT_NAME_MATCH_LIMIT = 500
PUBLIC_PRODUCT_FIELDS = {
    "name",
    "description",
    "status",
    "price",
    "originalPrice",
    "discount",
    "rating",
    "reviewCount",
    "category",
    "subCategory",
    "models",
    "tags",
    "bestSeller",
    "stockQuantity",
}
PUBLIC_PRODUCT_PROJECTION = {field: 1 for field in PUBLIC_PRODUCT_FIELDS}
PUBLIC_PRODUCT_PROJECTION["_id"] = 0
PUBLIC_DISTINCT_FIELDS = {
    "name",
    "status",
    "category",
    "subCategory",
    "models",
    "tags",
    "bestSeller",
}
NARRATION_OMITTED_FIELDS = {
    "_id",
    "image",
    "images",
    "comments",
    "userId",
    "password",
    "providerId",
    "token",
    "address",
    "phone",
    "email",
}
SENSITIVE_COLLECTION_NAMES = {
    "user",
    "users",
    "customer",
    "customers",
    "order",
    "orders",
    "cart",
    "carts",
    "comment",
    "comments",
    "admin",
    "admins",
}
SENSITIVE_FIELD_NAMES = {
    "password",
    "providerId",
    "token",
    "jwt",
    "secret",
    "email",
    "phone",
    "address",
    "userId",
    "role",
    "cartData",
    "payment",
    "paymentMethod",
}
SENSITIVE_REQUEST_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in (
        r"\b(passwords?|password hashes?|tokens?|jwts?|secrets?|api keys?|credentials?)\b",
        r"\b(?:user|users|customer|customers|admin|admins)\b.*\b(?:email|phone|address|password|token|role|id)s?\b",
        r"\b(?:order|orders|payment|payments)\b.*\b(?:address|email|phone|user|customer|amount|status)s?\b",
        r"\b(?:dump|export|list|show|get|retrieve)\b.*\b(?:users?|customers?|orders?|databases?|collections?|schemas?)\b",
        r"\b(?:ignore|bypass|override|forget)\b.*\b(?:instruction|rules|guard|policy|system)\b",
    )
]
ALLOWED_OPERATIONS = {"find", "count", "distinct"}
ALLOWED_LOGICAL_OPERATORS = {"$and", "$or", "$nor"}
ALLOWED_FIELD_OPERATORS = {
    "$eq",
    "$ne",
    "$in",
    "$nin",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$regex",
    "$options",
    "$exists",
    "$type",
    "$all",
}
ALLOWED_REGEX_OPTIONS = set("imsx")
ALLOWED_TYPE_VALUES = {"string", "number", "double", "int", "long", "bool", "boolean", "array"}
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

class UnsafeQueryError(ValueError):
    """Raised when a model-generated query leaves the public chatbot boundary."""


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


def _public_projection() -> dict[str, int]:
    return dict(PUBLIC_PRODUCT_PROJECTION)


def _query_used_for_response(plan: dict) -> Optional[dict]:
    return plan if EXPOSE_QUERY_PLAN else None


def _question_requests_sensitive_data(question: str) -> bool:
    return any(pattern.search(question) for pattern in SENSITIVE_REQUEST_PATTERNS)


def _validate_public_field_path(field: Any) -> str:
    if not isinstance(field, str) or not field:
        raise UnsafeQueryError("Invalid query field.")

    if "\x00" in field or field.startswith("$"):
        raise UnsafeQueryError("Invalid query field.")

    parts = field.split(".")
    if any(not part or part.startswith("$") for part in parts):
        raise UnsafeQueryError("Invalid query field.")

    top_level = parts[0]
    if top_level not in PUBLIC_PRODUCT_FIELDS or top_level in SENSITIVE_FIELD_NAMES:
        raise UnsafeQueryError("That field is not available to the public chatbot.")

    return field


def _sanitize_literal(value: Any) -> Any:
    if isinstance(value, str):
        if "\x00" in value or len(value) > 500:
            raise UnsafeQueryError("Invalid query value.")
        return value

    if isinstance(value, bool) or isinstance(value, int) or isinstance(value, float) or value is None:
        return value

    if isinstance(value, list):
        if len(value) > 50:
            raise UnsafeQueryError("Query value list is too large.")
        return [_sanitize_literal(item) for item in value]

    raise UnsafeQueryError("Only scalar query values are allowed.")


def _sanitize_regex(value: Any) -> str:
    if not isinstance(value, str) or not value or "\x00" in value or len(value) > 120:
        raise UnsafeQueryError("Invalid regex query value.")

    try:
        re.compile(value)
    except re.error as exc:
        raise UnsafeQueryError("Invalid regex query value.") from exc

    return value


def _sanitize_field_operator(operator: str, value: Any) -> Any:
    if operator not in ALLOWED_FIELD_OPERATORS:
        raise UnsafeQueryError("That MongoDB operator is not allowed.")

    if operator == "$regex":
        return _sanitize_regex(value)

    if operator == "$options":
        if not isinstance(value, str) or any(char not in ALLOWED_REGEX_OPTIONS for char in value):
            raise UnsafeQueryError("Invalid regex options.")
        return value

    if operator == "$exists":
        if not isinstance(value, bool):
            raise UnsafeQueryError("$exists requires a boolean value.")
        return value

    if operator == "$type":
        if isinstance(value, str) and value in ALLOWED_TYPE_VALUES:
            return value
        raise UnsafeQueryError("$type is restricted to safe public product types.")

    if operator in ("$in", "$nin", "$all"):
        if not isinstance(value, list):
            raise UnsafeQueryError(f"{operator} requires a list.")
        if len(value) > 50:
            raise UnsafeQueryError("Query value list is too large.")
        return [_sanitize_literal(item) for item in value]

    return _sanitize_literal(value)


def _sanitize_filter(filt: Any) -> dict:
    if filt in (None, ""):
        return {}

    if not isinstance(filt, dict):
        raise UnsafeQueryError("Query filter must be an object.")

    if len(filt) > 25:
        raise UnsafeQueryError("Query filter is too large.")

    sanitized = {}
    for key, value in filt.items():
        if not isinstance(key, str):
            raise UnsafeQueryError("Invalid query filter key.")

        if key in ALLOWED_LOGICAL_OPERATORS:
            if not isinstance(value, list) or len(value) > 10:
                raise UnsafeQueryError(f"{key} requires a small list of filters.")
            sanitized[key] = [_sanitize_filter(item) for item in value]
            continue

        if key.startswith("$"):
            raise UnsafeQueryError("That MongoDB operator is not allowed.")

        field = _validate_public_field_path(key)
        if isinstance(value, dict):
            if not value:
                raise UnsafeQueryError("Empty field operator objects are not allowed.")

            operator_doc = {}
            for operator, operator_value in value.items():
                if not isinstance(operator, str) or not operator.startswith("$"):
                    raise UnsafeQueryError("Nested object filters are not allowed.")
                operator_doc[operator] = _sanitize_field_operator(operator, operator_value)
            sanitized[field] = operator_doc
        else:
            sanitized[field] = _sanitize_literal(value)

    return sanitized


def _sanitize_sort(sort: Any) -> dict:
    if not sort:
        return {}

    if not isinstance(sort, dict):
        raise UnsafeQueryError("Sort must be an object.")

    if len(sort) > 5:
        raise UnsafeQueryError("Sort is too large.")

    sanitized = {}
    for field, direction in sort.items():
        safe_field = _validate_public_field_path(field)
        if isinstance(direction, bool):
            raise UnsafeQueryError("Sort direction must be 1 or -1.")

        try:
            normalized_direction = int(direction)
        except (TypeError, ValueError) as exc:
            raise UnsafeQueryError("Sort direction must be 1 or -1.") from exc

        if normalized_direction not in (1, -1):
            raise UnsafeQueryError("Sort direction must be 1 or -1.")

        sanitized[safe_field] = normalized_direction

    return sanitized


def _sanitize_limit(limit: Any, default: int = RESULT_LIMIT) -> int:
    if isinstance(limit, bool):
        return default

    try:
        normalized_limit = int(limit)
    except (TypeError, ValueError):
        normalized_limit = default

    if normalized_limit < 1:
        normalized_limit = default

    return min(normalized_limit, RESULT_LIMIT)


def _sanitize_projection(projection: Any) -> dict:
    if projection:
        if not isinstance(projection, dict):
            raise UnsafeQueryError("Projection must be an object.")
        for field in projection:
            if field == "_id":
                continue
            _validate_public_field_path(field)

    return _public_projection()


def _sanitize_distinct_field(field: Any) -> str:
    safe_field = _validate_public_field_path(field)
    if safe_field not in PUBLIC_DISTINCT_FIELDS:
        raise UnsafeQueryError("Distinct queries are restricted to public product facets.")
    return safe_field


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
        if database and not ALLOW_DATABASE_OVERRIDE:
            raise UnsafeQueryError("Database overrides are disabled for the public chatbot.")
        return self._client[database or DEFAULT_DB]

    async def list_collections(self, database: Optional[str] = None) -> dict:
        names = await self._public_collection_names(database)
        return {"database": PUBLIC_DATABASE_LABEL, "collections": names}

    async def infer_schema(
        self,
        collection: str,
        database: Optional[str] = None,
    ) -> dict:
        collection = await self._resolve_public_collection_name(collection, database)
        db = self._db(database)
        cursor = db[collection].find({}, _public_projection()).limit(SCHEMA_SAMPLE_SIZE)
        docs = await cursor.to_list(length=SCHEMA_SAMPLE_SIZE)
        schema = {
            field: value_type
            for field, value_type in _build_schema_from_docs(docs).items()
            if field in PUBLIC_PRODUCT_FIELDS
        }
        return {
            "database": PUBLIC_DATABASE_LABEL,
            "collection": collection,
            "inferred_schema": schema,
            "sample_size": len(docs),
        }

    async def _public_collection_names(self, database: Optional[str] = None) -> list[str]:
        names = await self._db(database).list_collection_names()
        return sorted(name for name in names if name.casefold() in PRODUCT_COLLECTION_NAMES)

    async def _resolve_public_collection_name(
        self,
        collection: Optional[str],
        database: Optional[str] = None,
    ) -> str:
        requested = (collection or "").strip()
        if requested.casefold() in SENSITIVE_COLLECTION_NAMES:
            raise UnsafeQueryError(SAFE_REFUSAL_MESSAGE)

        names = await self._public_collection_names(database)
        if not names:
            raise UnsafeQueryError("No public product collection is available.")

        if not requested:
            return names[0]

        for name in names:
            if name.casefold() == requested.casefold():
                return name

        raise UnsafeQueryError(SAFE_REFUSAL_MESSAGE)

    async def _product_collection_name(self, database: Optional[str] = None) -> Optional[str]:
        names = await self._public_collection_names(database)
        return names[0] if names else None

    async def _full_schema_context(self, database: Optional[str] = None) -> str:
        """
        Build a compact text description of every collection + its fields.
        This is injected into the Claude prompt so it can generate accurate MQL.
        """
        db = self._db(database)
        names = await self._public_collection_names(database)
        lines = [f"Database: {PUBLIC_DATABASE_LABEL}", "Collections and their fields:"]
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

        return constrained_plan

    def _normalise_plan_shape(self, plan: Any) -> dict:
        if not isinstance(plan, dict):
            raise UnsafeQueryError("The generated query plan was invalid.")

        normalized_plan = dict(plan)
        operation = str(normalized_plan.get("operation", "find")).lower()
        collection_name = normalized_plan.get("collection", "")

        if "aggregate" in normalized_plan or "pipeline" in normalized_plan:
            raise UnsafeQueryError(SAFE_REFUSAL_MESSAGE)

        if not collection_name:
            for alt_key in ("find", "count", "distinct"):
                val = normalized_plan.get(alt_key)
                if isinstance(val, str) and val:
                    collection_name = val
                    operation = alt_key
                    break

        normalized_plan["collection"] = collection_name
        normalized_plan["operation"] = operation
        return normalized_plan

    async def _sanitize_plan(self, plan: Any, database: Optional[str] = None) -> dict:
        plan = self._normalise_plan_shape(plan)
        operation = plan.get("operation", "find")

        if operation not in ALLOWED_OPERATIONS:
            raise UnsafeQueryError(SAFE_REFUSAL_MESSAGE)

        collection_name = await self._resolve_public_collection_name(
            plan.get("collection"),
            database,
        )

        sanitized = {
            "collection": collection_name,
            "operation": operation,
        }

        if operation == "count":
            sanitized["filter"] = _sanitize_filter(plan.get("filter", {}))
            return sanitized

        if operation == "distinct":
            sanitized["field"] = _sanitize_distinct_field(plan.get("field"))
            sanitized["filter"] = _sanitize_filter(plan.get("filter", {}))
            return sanitized

        sanitized["filter"] = _sanitize_filter(plan.get("filter", {}))
        sanitized["projection"] = _sanitize_projection(plan.get("projection"))
        sanitized["sort"] = _sanitize_sort(plan.get("sort", {}))
        sanitized["limit"] = _sanitize_limit(plan.get("limit", RESULT_LIMIT))
        return sanitized

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
          "operation": "find" | "count" | "distinct",
          "filter": {...},           // for find / count
          "field": "<name>",         // for distinct
          "projection": {...},       // optional, for find
          "sort": {...},             // optional, for find
          "limit": <int>             // optional, for find
        }
        """
        system = (
            "You are an expert MongoDB query planner. "
            "You are planning queries only for a public ecommerce product catalog. "
            "Never plan queries for users, customers, orders, carts, comments, credentials, "
            "emails, phone numbers, addresses, roles, tokens, or any internal data. "
            "Output ONLY a single valid JSON object — no prose, no markdown fences.\n\n"
            "The JSON object MUST always contain exactly these two top-level keys:\n"
            "  \"collection\": the exact collection name from the schema\n"
            "  \"operation\": one of find | count | distinct\n\n"
            "Always use \"collection\". Do not use aggregation pipelines.\n\n"
            "Additional keys by operation:\n"
            "  find      -> filter ({}), projection ({\"_id\":0}), sort ({}), limit (int)\n"
            "  count     -> filter ({})\n"
            "  distinct  -> field (str), filter ({})\n\n"
            "For find operations always include limit <= 50.\n"
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
        question = question.strip()
        db = self._db(database)

        if not question:
            return {
                "question": question,
                "answer": "Please ask a product catalog question.",
                "query_used": None,
                "raw_count": 0,
                "database": PUBLIC_DATABASE_LABEL,
                "collection": None,
            }

        if len(question) > MAX_QUESTION_LENGTH or _question_requests_sensitive_data(question):
            return {
                "question": question,
                "answer": SAFE_REFUSAL_MESSAGE,
                "query_used": None,
                "raw_count": 0,
                "database": PUBLIC_DATABASE_LABEL,
                "collection": None,
            }

        product_query_filter = _product_query_filter(question)
        product_collection_name = await self._product_collection_name(database)

        if product_query_filter and product_collection_name:
            plan = await self._sanitize_plan({
                "collection": product_collection_name,
                "operation": "find",
                "filter": product_query_filter,
                "projection": _public_projection(),
                "sort": {"price": 1},
                "limit": PRODUCT_QUERY_LIMIT,
            }, database)
            col = db[product_collection_name]
            filt = await self._normalise_filter_values(
                product_collection_name,
                plan["filter"],
                database,
            )
            filt = _sanitize_filter(filt)
            plan["filter"] = filt
            cursor = col.find(filt, plan["projection"]).sort(list(plan["sort"].items())).limit(plan["limit"])
            results = await cursor.to_list(length=plan["limit"])
            answer = self._narrate_results(question, plan, results, len(results))

            return {
                "question": question,
                "answer": answer,
                "query_used": _query_used_for_response(plan),
                "raw_count": len(results),
                "database": PUBLIC_DATABASE_LABEL,
                "collection": product_collection_name,
            }

        # 1. Build schema context
        schema_context = await self._full_schema_context(database)

        # 2. Plan and validate the query before anything reaches MongoDB.
        try:
            plan = self._normalise_plan_shape(self._plan_query(question, schema_context))
            operation = plan.get("operation", "find")
            collection_name = await self._resolve_public_collection_name(
                plan.get("collection"),
                database,
            )
            plan["collection"] = collection_name
        except UnsafeQueryError:
            return {
                "question": question,
                "answer": SAFE_REFUSAL_MESSAGE,
                "query_used": None,
                "raw_count": 0,
                "database": PUBLIC_DATABASE_LABEL,
                "collection": None,
            }

        matched_product_name = await self._match_named_product(
            collection_name,
            question,
            database,
        )
        if matched_product_name and operation == "find":
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
                "projection": _public_projection(),
                "sort": {},
                "limit": 1,
            }
        elif operation in ALLOWED_OPERATIONS:
            plan = self._apply_product_intent_constraint(
                plan,
                question,
                operation,
                collection_name,
            )

        try:
            plan = await self._sanitize_plan(plan, database)
        except UnsafeQueryError:
            return {
                "question": question,
                "answer": SAFE_REFUSAL_MESSAGE,
                "query_used": None,
                "raw_count": 0,
                "database": PUBLIC_DATABASE_LABEL,
                "collection": None,
            }

        operation = plan["operation"]
        collection_name = plan["collection"]
        col = db[collection_name]

        # 3. Execute query
        results: list[Any] = []
        try:
            if operation == "count":
                filt = plan.get("filter", {})
                filt = await self._normalise_filter_values(collection_name, filt, database)
                filt = _sanitize_filter(filt)
                plan["filter"] = filt
                count = await col.count_documents(filt)
                results = [{"count": count}]

            elif operation == "distinct":
                field = plan.get("field", "")
                filt = plan.get("filter", {})
                filt = await self._normalise_filter_values(collection_name, filt, database)
                filt = _sanitize_filter(filt)
                plan["filter"] = filt
                results = await col.distinct(field, filt)
                results = [{"values": results[:RESULT_LIMIT]}]

            else:  # find (default)
                filt = plan.get("filter", {})
                filt = await self._normalise_filter_values(collection_name, filt, database)
                filt = _sanitize_filter(filt)
                plan["filter"] = filt
                projection = _sanitize_projection(plan.get("projection"))
                plan["projection"] = projection
                sort = plan.get("sort")
                limit = _sanitize_limit(plan.get("limit", RESULT_LIMIT))
                plan["limit"] = limit

                cursor = col.find(filt, projection)
                if sort:
                    sort_list = list(sort.items())
                    cursor = cursor.sort(sort_list)
                cursor = cursor.limit(limit)
                results = await cursor.to_list(length=limit)

        except Exception as exc:
            return {
                "question": question,
                "answer": "I couldn't complete that product catalog lookup right now.",
                "query_used": _query_used_for_response(plan),
                "raw_count": 0,
                "database": PUBLIC_DATABASE_LABEL,
                "collection": collection_name,
            }

        count = len(results)

        # 4. Narrate results
        answer = self._narrate_results(question, plan, results, count)

        return {
            "question": question,
            "answer": answer,
            "query_used": _query_used_for_response(plan),
            "raw_count": count,
            "database": PUBLIC_DATABASE_LABEL,
            "collection": collection_name,
        }
