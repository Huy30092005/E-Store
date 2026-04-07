import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("DB_NAME")]

products_collect = db[os.getenv("PRODUCTS_COLLECTION")]
vector_collect = db[os.getenv("VECTOR_COLLECTION")]

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
CHAT_MODEL      = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")