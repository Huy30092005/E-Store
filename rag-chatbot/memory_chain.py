from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from retriever import retriever

store = {}

def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

SYSTEM_PROMPT = """You are a helpful product assistant for an electronics/technology store named SimTech.
Use ONLY the retrieved context to answer. If unsure, say so

Context:
{context}
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)

def format_docs(docs):
    return "\n\n---\n\n".join(doc.page_content for doc in docs)

from langchain_core.runnables import RunnablePassthrough, RunnableLambda

chain = (
    {
        "context": RunnableLambda(lambda x: x["question"]) | retriever | format_docs,
        "question": RunnablePassthrough() | RunnableLambda(lambda x: x["question"]),
        "chat_history": RunnablePassthrough() | RunnableLambda(lambda x: x.get("chat_history", [])),
    }
    | prompt
    | llm
    | StrOutputParser()
)

conversational_chain = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="question",
    history_messages_key="chat_history",
)