from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from db import products_collect, vector_collect
import os

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
INDEX_NAME = "vector_index"


def get_embeddings():
    return OpenAIEmbeddings(model=EMBEDDING_MODEL)


def build_text(product: dict) -> str:
    """Combine product fields into one searchable string."""
    desc = product.get("description", "")[:400]
    return (
        f"Name: {product.get('name', '')}\n"
        f"Description: {desc}\n"
        f"Category: {', '.join(product.get('category', []))}\n"
        f"Tags: {', '.join(product.get('tags', []))}\n"
        f"Price: ${product.get('price', '')}\n"
        f"(was ${product.get('originalPrice', '')})\n"
        f"Rating: {product.get('rating', '')} ({product.get('reviewCount', 0)} reviews)"
    )


def build_doc(product: dict) -> Document:
    """Convert a raw product dict into a LangChain Document."""
    return Document(
        page_content=build_text(product),
        metadata={
            "product_id": str(product.get("_id", "")),  # anchor for delete/update
            "name":       product.get("name", ""),
            "price":      product.get("price"),
            "rating":     product.get("rating"),
            "category":   ", ".join(product.get("category", [])),
            "tags":       ", ".join(product.get("tags", [])),
        }
    )


# ── Single-document operations ──────────────────────────────────────────────

def ingest_one(product: dict) -> None:
    """Embed and insert a single product. Used on CREATE."""
    doc = build_doc(product)
    MongoDBAtlasVectorSearch.from_documents(
        documents=[doc],
        embedding=get_embeddings(),
        collection=vector_collect,
        index_name=INDEX_NAME,
    )
    print(f" Inserted vector for product: {product.get('name', '')}")


def delete_one(product_id: str) -> None:
    """Delete the vector document matching product_id. Used on DELETE."""
    result = vector_collect.delete_one({"metadata.product_id": product_id})
    if result.deleted_count:
        print(f"  Deleted vector for product_id: {product_id}")
    else:
        print(f"  No vector found for product_id: {product_id}")


def update_one(product: dict) -> None:
    """Delete old vector and insert fresh one. Used on UPDATE."""
    product_id = str(product.get("_id", ""))
    delete_one(product_id)
    ingest_one(product)
    print(f"🔄 Updated vector for product_id: {product_id}")


# ── Full ingest (manual / admin only) ───────────────────────────────────────

def ingest(force=False):
    if not force and vector_collect.count_documents({}) > 0:
        print(f"  product_vector already has {vector_collect.count_documents({})} docs.")
        print("    Run with force=True to re-embed. Skipping.")
        return

    products = list(products_collect.find(
        {"status": "active"},
        {
            "image":  0,
            "date":   0,
            "__v":    0,
            "status": 0,
        }
    ))

    docs = [build_doc(p) for p in products]

    MongoDBAtlasVectorSearch.from_documents(
        documents=docs,
        embedding=get_embeddings(),
        collection=vector_collect,
        index_name=INDEX_NAME,
    )
    print(f" Ingested {len(docs)} products into product_vector")


if __name__ == "__main__":
    ingest()