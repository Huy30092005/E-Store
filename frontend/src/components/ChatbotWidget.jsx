import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  TypingIndicator,
} from "@chatscope/chat-ui-kit-react";
import { ArrowUpRight, MessageCircle, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";
import { getChatbotSessionId, sendChatMessage } from "../services/chatbot";
import { getProducts } from "../services/api";

const WELCOME_MESSAGE = {
  id: "welcome",
  sender: "SimTech Assistant",
  direction: "incoming",
  content:
    "Hi! I'm your SimTech assistant. Ask me about products, recommendations, orders, or store data.",
  sentTime: "just now",
};
const GENERIC_PRODUCT_NAME_TOKENS = new Set([
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
]);
const PRODUCT_TYPE_ALIASES = {
  laptop: ["laptop", "laptops"],
  phone: ["phone", "phones", "smartphone", "smartphones"],
  tablet: ["tablet", "tablets"],
  camera: ["camera", "cameras"],
  wearable: ["wearable", "wearables", "watch", "watches"],
  accessory: ["accessory", "accessories"],
  audio: ["audio", "headphone", "headphones", "speaker", "speakers"],
  pc: ["pc", "pcs", "desktop", "desktops", "computer", "computers"],
};
const PRODUCT_TYPE_CATEGORIES = {
  laptop: "laptop",
  phone: "phone",
  tablet: "tablet",
  camera: "camera",
  wearable: "wearable",
  accessory: "accessory",
  audio: "audio",
  pc: "pc",
};
const USAGE_ALIASES = {
  gaming: ["gaming", "game", "games", "gamer", "gamers"],
};
const USAGE_CATEGORIES = {
  gaming: "gaming",
};
const MARKDOWN_COMPONENTS = {
  img: () => null,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
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

function getRequestedProductType(question = "") {
  const normalizedQuestion = ` ${normalizeText(question)} `;

  return Object.entries(PRODUCT_TYPE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizedQuestion.includes(` ${alias} `))
  )?.[0];
}

function getRequestedUsage(question = "") {
  const normalizedQuestion = ` ${normalizeText(question)} `;

  return Object.entries(USAGE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizedQuestion.includes(` ${alias} `))
  )?.[0];
}

function getProductCategories(product) {
  return [
    ...(Array.isArray(product?.categories) ? product.categories : []),
    product?.category,
    ...(Array.isArray(product?.tags) ? product.tags : []),
  ]
    .filter(Boolean)
    .map(normalizeText);
}

function productMatchesRequestedType(product, productType) {
  if (!productType) {
    return true;
  }

  const expectedCategory = PRODUCT_TYPE_CATEGORIES[productType];
  const categories = getProductCategories(product);

  if (categories.includes(expectedCategory)) {
    return true;
  }

  const aliases = PRODUCT_TYPE_ALIASES[productType] || [];
  const searchableText = normalizeText(`${product?.name || ""} ${product?.subCategory || ""}`);

  return aliases.some((alias) => searchableText.includes(alias));
}

function productMatchesRequestedUsage(product, usage) {
  if (!usage) {
    return true;
  }

  const expectedCategory = USAGE_CATEGORIES[usage];
  const categories = getProductCategories(product);

  if (categories.includes(expectedCategory)) {
    return true;
  }

  const aliases = USAGE_ALIASES[usage] || [];
  const searchableText = normalizeText(`${product?.name || ""} ${product?.subCategory || ""}`);

  return aliases.some((alias) => searchableText.includes(alias));
}

function getProductNameTokens(product) {
  return normalizeText(product?.name)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function isSpecificProductPhrase(phrase) {
  return phrase.split(" ").some((token) => token.length >= 4 || /\d/.test(token));
}

function getProductNamePhrases(product) {
  const tokens = getProductNameTokens(product);

  return tokens
    .slice(0, -1)
    .map((token, index) => `${token} ${tokens[index + 1]}`)
    .filter(isSpecificProductPhrase);
}

function scoreProductMention(text, product) {
  const normalizedText = normalizeText(text);
  const normalizedName = normalizeText(product?.name);

  if (!normalizedText || !normalizedName) {
    return 0;
  }

  if (normalizedText.includes(normalizedName)) {
    return 100 + getProductNameTokens(product).length;
  }

  const matchingPhrases = getProductNamePhrases(product).filter((phrase) =>
    normalizedText.includes(phrase)
  );

  if (matchingPhrases.length === 0) {
    return 0;
  }

  return 50 + matchingPhrases.reduce((score, phrase) => score + phrase.length, 0);
}

function scoreProductQuestionMention(text, product) {
  const normalizedText = normalizeText(text);
  const normalizedName = normalizeText(product?.name);

  if (!normalizedText || !normalizedName) {
    return 0;
  }

  if (normalizedText.includes(normalizedName)) {
    return 1000 + normalizedName.length;
  }

  const tokens = getProductNameTokens(product);
  const firstPhrase = tokens.slice(0, 2).join(" ");

  if (firstPhrase && normalizedText.includes(firstPhrase)) {
    return 500 + firstPhrase.length;
  }

  const strongTokens = tokens.filter(
    (token) =>
      !GENERIC_PRODUCT_NAME_TOKENS.has(token) &&
      (token.length >= 5 || /\d/.test(token))
  );
  const matchedTokens = strongTokens.filter((token) =>
    normalizedText.includes(token)
  );

  if (matchedTokens.length === 0) {
    return 0;
  }

  return 100 + matchedTokens.reduce((score, token) => score + token.length, 0);
}

function findRelatedProducts(answer, products, question = "") {
  if (!Array.isArray(products) || products.length === 0) {
    return [];
  }

  const requestedProductType = getRequestedProductType(question);
  const requestedUsage = getRequestedUsage(question);
  const hasProductIntent = requestedProductType || requestedUsage;
  const candidateProducts = hasProductIntent
    ? products.filter((product) =>
        productMatchesRequestedType(product, requestedProductType) &&
        productMatchesRequestedUsage(product, requestedUsage)
      )
    : products;

  if (hasProductIntent && candidateProducts.length === 0) {
    return [];
  }

  const questionMatches = candidateProducts
    .map((product) => ({ product, score: scoreProductQuestionMention(question, product) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  if (questionMatches.length > 0) {
    return questionMatches.slice(0, 3).map(({ product }) => product);
  }

  const normalizedAnswer = normalizeText(answer);

  if (!normalizedAnswer) {
    return [];
  }

  const scoredProducts = candidateProducts
    .map((product) => ({ product, score: scoreProductMention(normalizedAnswer, product) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  return scoredProducts.slice(0, 3).map(({ product }) => product);
}

function getProductKey(product) {
  return product?._id || product?.id || product?.name;
}

function compactMarkdown(text = "") {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PRODUCT_DETAIL_LABELS = new Set([
  "available models",
  "categories",
  "description",
  "features",
  "key features",
  "name",
  "price",
  "product name",
  "rating",
  "status",
  "stock",
  "stock quantity",
]);

function parseDetailLine(line) {
  const trimmedLine = line.trim();
  const match = trimmedLine.match(/^(?:[-*]\s*)?(?:\*\*)?([^:*]+?)(?:\*\*)?\s*:\s*(.*)$/);

  if (!match) {
    return null;
  }

  const label = match[1].trim();
  const normalizedLabel = normalizeText(label);

  if (!PRODUCT_DETAIL_LABELS.has(normalizedLabel)) {
    return null;
  }

  return {
    label,
    value: match[2].trim(),
  };
}

function compactProductDetailsMarkdown(text = "") {
  const lines = compactMarkdown(text).split(/\r?\n/);
  const intro = [];
  const details = [];
  let currentDetail = null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      return;
    }

    const parsedDetail = parseDetailLine(trimmedLine);

    if (parsedDetail) {
      currentDetail = parsedDetail;
      details.push(currentDetail);
      return;
    }

    if (currentDetail) {
      currentDetail.value = [currentDetail.value, trimmedLine]
        .filter(Boolean)
        .join(" ");
      return;
    }

    intro.push(trimmedLine);
  });

  if (details.length < 2) {
    return compactMarkdown(text);
  }

  const detailLines = details.map(({ label, value }) =>
    value ? `- **${label}:** ${value}` : `- **${label}:**`
  );

  return compactMarkdown([...intro, "", ...detailLines].join("\n"));
}

function lineLooksLikeProductLink(line, relatedProducts) {
  const normalizedLine = normalizeText(line);

  if (!normalizedLine || !/(view|link|here|product page|check out)/.test(normalizedLine)) {
    return false;
  }

  return relatedProducts.some((product) => {
    const normalizedName = normalizeText(product?.name);
    return normalizedName && normalizedLine.includes(normalizedName);
  });
}

function cleanAssistantAnswer(answer, relatedProducts) {
  if (!Array.isArray(relatedProducts) || relatedProducts.length === 0) {
    return compactProductDetailsMarkdown(answer);
  }

  return compactProductDetailsMarkdown(
    answer
      .split(/\r?\n/)
      .filter((line) => !lineLooksLikeProductLink(line, relatedProducts))
      .join("\n")
  );
}

function ProductAnswerRow({ product }) {
  return (
    <Link
      to={`/product/${product._id}`}
      className="chatbot-product-card group flex w-full max-w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 transition hover:border-brand-300 hover:shadow-md"
    >
      <img
        src={product.image}
        alt={product.name}
        className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-5 text-slate-900 dark:text-brand-200">
          {product.name}
        </p>
        <p className="truncate text-xs font-medium text-slate-500">
          {product.category || "Product"} - ${Number(product.price || 0).toFixed(2)}
        </p>
      </div>
      <ArrowUpRight
        size={16}
        className="shrink-0 text-slate-400 transition group-hover:text-brand-600"
      />
    </Link>
  );
}

function RelatedProductLinks({ products }) {
  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  return (
    <div className="chatbot-related-products">
      <p className="chatbot-related-label">
        {products.length === 1 ? "Related product" : "Related products"}
      </p>
      <div className="grid gap-2">
        {products.map((product) => (
          <ProductAnswerRow key={getProductKey(product)} product={product} />
        ))}
      </div>
    </div>
  );
}

function AssistantMessageContent({ message }) {
  const answer = cleanAssistantAnswer(
    message.model.message,
    message.model.relatedProducts
  );

  return (
    <div className="chatbot-answer-flow">
      {answer ? (
        <div className="chatbot-markdown">
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{answer}</ReactMarkdown>
        </div>
      ) : null}
      <RelatedProductLinks products={message.model.relatedProducts} />
    </div>
  );
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
          relatedProducts: findRelatedProducts(answer, productCatalog, userMessage),
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
                    AI Agent
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
              Ask product and store questions powered by the FastAPI AI agent.
            </p>
          </div>

          <div className="chatbot-main h-[32rem] bg-slate-50/90">
            <MainContainer responsive>
              <ChatContainer>
                <MessageList
                  typingIndicator={
                    isLoading ? (
                      <TypingIndicator content="SimTech Assistant is checking store data..." />
                    ) : null
                  }
                >
                  {uiMessages.map((message) => (
                    <Message key={message.key} model={message.model}>
                      <Message.CustomContent>
                        {message.isUser ? (
                          <div className="chatbot-markdown chatbot-markdown-user">
                            <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                              {message.model.message}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <AssistantMessageContent message={message} />
                        )}
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
