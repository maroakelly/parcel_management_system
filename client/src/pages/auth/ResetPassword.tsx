import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function ResetPassword() {
const [searchParams] = useSearchParams();
const token = searchParams.get("token") || "";

const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [message, setMessage] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleSubmit(
event: React.FormEvent<HTMLFormElement>
) {
event.preventDefault();

setMessage("");
setError("");

if (!token) {
  setError(
    "Your reset link is invalid or incomplete. Please request a new link."
  );
  return;
}

if (password.length < 8) {
  setError("Your password must be at least 8 characters long.");
  return;
}

if (password !== confirmPassword) {
  setError("The passwords do not match.");
  return;
}

setLoading(true);

try {
  const response = await fetch(
    `${API_URL}/api/reset-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Unable to reset your password."
    );
  }

  setMessage(
    "Password successfully reset! You can now log in with your new password."
  );

  setError("");
  setPassword("");
  setConfirmPassword("");
} catch (err) {
  if (err instanceof TypeError) {
    setError(
      "Unable to connect to the server. Please try again."
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
<h2>Reset Password</h2>

    <p>
      Choose a new password for your ParcelFlow account.
    </p>

    {!token && (
      <p role="alert" style={{ color: "red" }}>
        The reset link is invalid or incomplete.
        Please request a new link.
      </p>
    )}

    <form onSubmit={handleSubmit}>
      <label htmlFor="new-password">
        New password
      </label>

      <input
        id="new-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter new password"
        autoComplete="new-password"
        minLength={8}
        required
        disabled={loading || !token || !!message}
      />

      <label htmlFor="confirm-password">
        Confirm new password
      </label>

      <input
        id="confirm-password"
        type="password"
        value={confirmPassword}
        onChange={(event) =>
          setConfirmPassword(event.target.value)
        }
        placeholder="Confirm new password"
        autoComplete="new-password"
        minLength={8}
        required
        disabled={loading || !token || !!message}
      />

      <button
        type="submit"
        disabled={loading || !token || !!message}
      >
        {loading ? "Resetting..." : "Reset Password"}
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