import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { getChatbotSessionId, sendChatMessage } from "../services/chatbot";
import { getProducts } from "../services/api";

const WELCOME_MESSAGE = {
  id: "welcome",
  sender: "SimTech Assistant",
  direction: "incoming",
  content:
    "Hi! I'm your SimTech assistant. Ask me about products, recommendations, orders, or anything the knowledge base can help with.",
  sentTime: "just now",
};

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findRelatedProducts(answer, products) {
  const normalizedAnswer = normalizeText(answer);

  if (!normalizedAnswer || products.length === 0) {
    return [];
  }

  const answerTokens = new Set(normalizedAnswer.split(" ").filter((token) => token.length >= 3));

  const scoredProducts = products
    .map((product) => {
      const normalizedName = normalizeText(product.name);
      const nameTokens = normalizedName.split(" ").filter((token) => token.length >= 3);
      const overlap = nameTokens.filter((token) => answerTokens.has(token)).length;
      const fullNameMatch = normalizedName && normalizedAnswer.includes(normalizedName);
      const startsWithPhrase = nameTokens.length >= 2 && normalizedAnswer.includes(nameTokens.slice(0, 2).join(" "));

      let score = 0;

      if (fullNameMatch) {
        score += 10;
      }

      if (startsWithPhrase) {
        score += 4;
      }

      score += overlap;

      return { product, score };
    })
    .filter(({ score }) => score >= 3)
    .sort((left, right) => right.score - left.score);

  return scoredProducts.slice(0, 3).map(({ product }) => product);
}

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [productCatalog, setProductCatalog] = useState([]);
  const sessionIdRef = useRef("");
  const abortControllerRef = useRef(null);
  const hasLoadedCatalogRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = getChatbotSessionId();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isOpen || hasLoadedCatalogRef.current) {
      return;
    }

    let active = true;
    hasLoadedCatalogRef.current = true;

    getProducts()
      .then((response) => {
        if (!active) {
          return;
        }

        setProductCatalog(response.data?.products || response.data || []);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setProductCatalog([]);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const uiMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const isUser = message.direction === "outgoing";

        return {
          key: message.id || `${message.direction}-${index}`,
          model: {
            message: message.content,
            sentTime: message.sentTime,
            sender: message.sender,
            direction: message.direction,
            position: "single",
            relatedProducts: message.relatedProducts || [],
          },
          isUser,
        };
      }),
    [messages]
  );

  const handleSendMessage = async (_, textContent) => {
    const userMessage = textContent.trim();

    if (!userMessage || isLoading) {
      return;
    }

    setErrorMessage("");
    const sentTime = formatTime(new Date());
    const userEntry = {
      id: `user-${Date.now()}`,
      sender: "You",
      direction: "outgoing",
      content: userMessage,
      sentTime,
    };

    setMessages((prev) => [...prev, userEntry]);
    setIsLoading(true);
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const answer = await sendChatMessage(
        userMessage,
        sessionIdRef.current,
        controller.signal
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: "SimTech Assistant",
          direction: "incoming",
          content: answer,
          relatedProducts: findRelatedProducts(answer, productCatalog),
          sentTime: formatTime(new Date()),
        },
      ]);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("Chatbot error:", error);
      setErrorMessage(
        error.message ||
          "Sorry, I'm having trouble connecting right now. Please try again later."
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section className="chatbot-shell animate-fade-up w-[min(100vw-1.5rem,25rem)] overflow-hidden rounded-[28px] border border-white/60 bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.22)] backdrop-blur sm:w-[25rem]">
          <div className="bg-linear-to-br from-brand-700 via-brand-500 to-accent-400 px-5 py-4 text-white">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-[0.18em] uppercase text-white/75">
                    RAG Support
                  </p>
                  <h3 className="text-lg font-semibold leading-tight">
                    SimTech Assistant
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-white/90 transition hover:bg-white/12 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <p className="max-w-[26ch] text-sm leading-6 text-white/84">
              Ask product questions and let the FastAPI RAG service answer from your store knowledge base.
            </p>
          </div>

          <div className="chatbot-main h-[32rem] bg-slate-50/90">
            <MainContainer responsive>
              <ChatContainer>
                <MessageList
                  typingIndicator={
                    isLoading ? (
                      <TypingIndicator content="SimTech Assistant is searching the knowledge base..." />
                    ) : null
                  }
                >
                  {uiMessages.map((message) => (
                    <Message key={message.key} model={message.model}>
                      <Message.CustomContent>
                        <div className="space-y-3">
                          <div
                            className={`chatbot-markdown ${
                              message.isUser ? "chatbot-markdown-user" : ""
                            }`}
                          >
                            <ReactMarkdown>{message.model.message}</ReactMarkdown>
                          </div>
                          {!message.isUser &&
                          Array.isArray(message.model.relatedProducts) &&
                          message.model.relatedProducts.length > 0 ? (
                            <div className="grid gap-2">
                              {message.model.relatedProducts.map((product) => (
                                <Link
                                  key={product._id}
                                  to={`/product/${product._id}`}
                                  className="chatbot-product-card flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 transition hover:border-brand-300 hover:shadow-md"
                                >
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-14 w-14 rounded-xl bg-slate-100 object-cover"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
                                      {product.category || "Product"}
                                    </p>
                                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                                      {product.name}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-600">
                                      ${Number(product.price || 0).toFixed(2)}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </Message.CustomContent>
                    </Message>
                  ))}
                </MessageList>
                {errorMessage ? (
                  <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}
                <MessageInput
                  attachButton={false}
                  sendButton
                  disabled={isLoading}
                  placeholder="Ask about products, pricing, specs, or support..."
                  onSend={handleSendMessage}
                />
              </ChatContainer>
            </MainContainer>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 rounded-full bg-slate-950 px-4 py-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-slate-900"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 transition group-hover:bg-brand-400">
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs uppercase tracking-[0.22em] text-white/55">
            Live Assistant
          </span>
          <span className="block text-sm font-semibold">
            Ask SimTech AI
          </span>
        </span>
      </button>
    </div>
  );
};

export default ChatbotWidget;
