import { useState } from "react";
import type { FormEvent } from "react";
import "./CustomerSupportChat.css";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function CustomerSupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hello! Welcome to ParcelFlow Support. Ask me about parcel tracking, delivery estimates, or payment methods.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = message.trim();

    if (!text || loading) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again to use customer support.");
      return;
    }

    setMessages((previous) => [
      ...previous,
      { role: "user", text },
    ]);
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to get a support response."
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "bot",
          text: data.reply || "Sorry, I couldn't answer that question.",
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to customer support."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="support-chat">
      {isOpen && (
        <section
          className="support-chat-window"
          aria-label="Customer support chat"
        >
          <header className="support-chat-header">
            <div>
              <strong>ParcelFlow Support</strong>
              <span>Customer assistance</span>
            </div>

            <button
              type="button"
              className="support-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="support-chat-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`support-chat-message ${item.role}`}
              >
                {item.text}
              </div>
            ))}

            {loading && (
              <div className="support-chat-message bot">
                Typing...
              </div>
            )}
          </div>

          {error && (
            <p className="support-chat-error" role="alert">
              {error}
            </p>
          )}

          <form className="support-chat-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask us a question..."
              aria-label="Your message"
              maxLength={1000}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="support-chat-toggle"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
        aria-expanded={isOpen}
      >
        {isOpen ? "×" : "💬"}
        {!isOpen && <span>Need help?</span>}
      </button>
    </div>
  );
}