import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerSupportPage.css";

type ChatMessage = {
  role: "user" | "bot";
  text: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const suggestions = [
  "How do I track my parcel?",
  "How long will delivery take?",
  "What payment methods are available?",
  "My parcel has been delayed",
];

export default function CustomerSupportPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hello! Welcome to ParcelFlow Support. I'm here to help with parcel tracking, delivery estimates, and payments. What can I help you with today?",
    },
  ]);

  async function sendMessage(
    event?: FormEvent<HTMLFormElement>,
    suggestedMessage?: string
  ) {
    event?.preventDefault();

    const text = (suggestedMessage ?? message).trim();

    if (!text || loading) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session has expired. Please log in again.");
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
          : "Unable to connect to support."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="customer-dashboard support-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📦</div>
          <div>
            <h2>PARCEL FLOW</h2>
            <span>Parcel System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => navigate("/customer/dashboard")}>
            <span>🏠</span> Dashboard
          </button>

          <button className="nav-item" onClick={() => navigate("/customer/create-parcel")}>
            <span>➕</span> Create Parcel
          </button>

          <button className="nav-item" onClick={() => navigate("/customer/my-parcels")}>
            <span>📦</span> My Parcels
          </button>

          <button className="nav-item" onClick={() => navigate("/customer/track-parcel")}>
            <span>🔍</span> Track Parcel
          </button>

          <button className="nav-item" onClick={() => navigate("/customer/payment")}>
            <span>💳</span> Payments
          </button>

          <button className="nav-item active" onClick={() => navigate("/customer/support")}>
            <span>💬</span> Customer Support
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item logout-button" onClick={handleLogout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main support-main">
        <header className="dashboard-header support-page-header">
          <div>
            <span className="support-eyebrow">PARCELFLOW ASSISTANCE</span>
            <h1>Customer Support</h1>
            <p>Get help with your parcels, deliveries, and payments.</p>
          </div>

          <div className="support-status">
            <span className="support-status-dot" />
            Support assistant
          </div>
        </header>

        <section className="support-welcome">
          <div className="support-welcome-icon">💬</div>
          <div>
            <h2>How can we help you today?</h2>
            <p>
              Ask a question below or choose one of the common topics to get started.
            </p>
          </div>
        </section>

        <section className="support-suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading}
              onClick={() => void sendMessage(undefined, suggestion)}
            >
              <span>↗</span>
              {suggestion}
            </button>
          ))}
        </section>

        <section className="support-conversation">
          <div className="support-conversation-header">
            <div className="support-avatar">PF</div>
            <div>
              <h2>ParcelFlow Assistant</h2>
              <p>Parcel and payment assistance</p>
            </div>
          </div>

          <div className="support-conversation-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`support-message-row ${item.role}`}
              >
                {item.role === "bot" && (
                  <div className="support-message-avatar">PF</div>
                )}
                <div className={`support-message-bubble ${item.role}`}>
                  {item.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="support-message-row bot">
                <div className="support-message-avatar">PF</div>
                <div className="support-message-bubble bot support-typing">
                  Preparing your response...
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="support-page-error" role="alert">
              {error}
            </div>
          )}

          <form className="support-composer" onSubmit={(event) => void sendMessage(event)}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your question here..."
              aria-label="Your support question"
              maxLength={1000}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !message.trim()}>
              Send message <span>➤</span>
            </button>
          </form>

          <p className="support-privacy-note">
            🔒 Your support conversation is sent securely to ParcelFlow.
          </p>
        </section>
      </main>
    </div>
  );
}