from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from retriever import retriever

SYSTEM_PROMPT = """ You are a product assisstant for an electronic/technology store named SimTech.
Use ONLY the context below to answer the customer's question.
If unsure, say so. Be concise.

Context:
{context}
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{question}"),
])

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2, max_tokens=400,)

def format_docs(docs):
    combined = "\n\n---\n\n".join(doc.page_content for doc in docs)
    return combined[:4000]


rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

