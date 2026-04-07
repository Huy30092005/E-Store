import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:8000";

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { role: "bot", content: "Hi! How can I help you today?" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Generate or retrieve session ID
    let sId = localStorage.getItem("chatbot_session_id");
    if (!sId) {
      sId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("chatbot_session_id", sId);
    }
    setSessionId(sId);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${CHATBOT_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from chatbot");
      }

      const data = await response.json();
      setChatHistory((prev) => [...prev, { role: "bot", content: data.answer }]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "bot", content: "Sorry, I'm having trouble connecting right now. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Customer Support</h3>
                <p className="text-xs text-brand-100">Always active</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                className={`flex ${
                  chat.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    chat.role === "user"
                      ? "bg-brand-600 text-white rounded-tr-none"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none"
                  }`}
                >
                  <ReactMarkdown className="prose prose-sm max-w-none break-words">
                    {chat.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                  <Loader2 className="animate-spin text-brand-600" size={16} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 bg-white border-t border-gray-100 flex gap-2"
          >
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className="bg-brand-600 text-white p-2 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-brand-600 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-200"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
};

export default ChatbotWidget;
