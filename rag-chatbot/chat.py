from memory_chain import conversational_chain

def chat():
    session_id = "user-session-1"
    print("Assistant ready to answer. Type 'quit to exit.\n")
    while True:
        question = input("You: ").strip()
        if question.lower() in ("quit", "exit"):
            break
        if not question:
            continue
        response = conversational_chain.invoke(
            {"question": question},
            config={"configurable": {"session_id": session_id}},
        )
        print(f"\nAsisstant: {response}\n")

if __name__ == "__main__":
    chat()