from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from db import products_collect, vector_collect, client
import os


def build_text(product: dict) -> str: 
    """Combine products field into 1 string to search"""

    desc = product.get("description", "")[:400]

    return (
        f"Name: {product.get('name', '')}\n"
        f"Description: {desc}\n"
        f"Category: {', '.join(product.get('category', []))}\n"
        f"Tags: {', '.join(product.get('tags', []))}\n"
        f"Price: ${product.get('price', '')}\n"
        f"(was ${product.get('originalPrice', '')})\n"
        f"Rating: {product.get('rating', '')} ({product.get('reviewCount', 0)} reviews )"
    )

def ingest(force=False):

    if not force and vector_collect.count_documents({}) > 0:
        print(f" vector_products already has {vector_collect.count_documents({})} docs.")
        print("  Run with force=True to re-embed. Skipping.")
        return

    products = list(products_collect.find(
        {"status": "active"},
        {
        "_id":           0,
        "image":         0,
        "date":          0,
        "__v":           0,
        "originalPrice": 0,   
        "status":        0,

        }
    ))
    
    docs = [
        Document(
            page_content=build_text(p),
            metadata={
                "name":     p.get("name", ""),
                "price":    p.get("price"),
                "rating":   p.get("rating"),
                "category": ", ".join(p.get("category", [])),
                "tags":     ", ".join(p.get("tags", [])),
            }
        )
        for p in products
    ]

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")


    MongoDBAtlasVectorSearch.from_documents(
        documents=docs,
        embedding=embeddings,
        collection=vector_collect,
        index_name="vector_index"
    )
    print(f"Ingested {len(docs)} products into vector_product")

if __name__ == "__main__":
    ingest()