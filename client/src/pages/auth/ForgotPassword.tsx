import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function ForgotPassword() {
const [email, setEmail] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setMessage("");
setError("");
setLoading(true);

try {
  const response = await fetch(
    `${API_URL}/api/forgot-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
      }),
    }
  );

  // Safely handle responses that are not valid JSON.
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Unable to send the reset link."
    );
  }

  // Display the success message after a successful API response.
  setMessage(
    "Reset link sent successfully! Please check your email."
  );

  setError("");
  setEmail("");
} catch (err) {
  setMessage("");

  if (err instanceof TypeError) {
    setError(
      "Unable to connect to the server. Please check your connection and try again."
    );
  } else {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again."
    );
  }
} finally {
  setLoading(false);
}

}

return (
<main className="password-reset-page">
<section className="password-reset-card">
<h2>Forgot Password?</h2>

    <p>
      Enter your account email address to request a
      password-reset link.
    </p>

    <form onSubmit={handleSubmit}>
      <label htmlFor="reset-email">
        Email address
      </label>

      <input
        id="reset-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        autoComplete="email"
        required
        disabled={loading}
      />

      <button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send Reset Link"}
      </button>
    </form>

    {message && (
      <p
        role="status"
        style={{
          color: "green",
          marginTop: "15px",
          fontWeight: "bold",
        }}
      >
        {message}
      </p>
    )}

    {error && (
      <p
        role="alert"
        style={{
          color: "red",
          marginTop: "15px",
        }}
      >
        {error}
      </p>
    )}

    <p>
      <Link to="/login">Back to Login</Link>
    </p>
  </section>
</main>

);
}