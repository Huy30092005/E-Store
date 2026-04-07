from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from db import vector_collect


embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = MongoDBAtlasVectorSearch(
    collection=vector_collect,
    embedding=embeddings,
    index_name="vector_index",
)

retriever = vector_store.as_retriever(search_kwargs={"k": 3})