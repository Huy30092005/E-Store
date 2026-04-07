const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:8000";
const SESSION_STORAGE_KEY = "chatbot_session_id";

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `session_${crypto.randomUUID()}`;
  }

  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getChatbotSessionId() {
  const existingSessionId = localStorage.getItem(SESSION_STORAGE_KEY);

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId = createSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export async function sendChatMessage(message, sessionId, signal) {
  const response = await fetch(`${CHATBOT_API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
    signal,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.message ||
        "The assistant is unavailable right now. Please try again in a moment."
    );
  }

  if (typeof payload?.answer !== "string" || !payload.answer.trim()) {
    throw new Error("The assistant returned an empty response.");
  }

  return payload.answer.trim();
}

