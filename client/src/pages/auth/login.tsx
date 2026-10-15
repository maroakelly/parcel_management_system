import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";

const wallpapers = [
  "https://images.unsplash.com/photo-1580674285054-bed31e145f59?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=85",
  "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=1800&q=85",
];

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wallpaperIndex, setWallpaperIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWallpaperIndex((current) => (current + 1) % wallpapers.length);
    }, 6500);

    return () => window.clearInterval(interval);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL;

    if (!apiUrl) {
      setError("The API URL is missing. Check your frontend environment settings.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const responseText = await response.text();

      let data: {
        token?: string;
        user?: { role?: string; [key: string]: unknown };
        message?: string;
        error?: string;
      };

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "The server returned an invalid response. Check your backend configuration."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || "Unable to sign in. Check your details.");
      }

      if (!data.token || !data.user) {
        throw new Error("The server did not return your account information.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const role = String(data.user.role || "").toUpperCase();

      if (["ADMIN", "SUPER_ADMIN", "SUPPORT"].includes(role)) {
        navigate("/admin/dashboard");
      } else if (role === "DRIVER") {
        navigate("/driver/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pf-login">
      {/* Changing delivery-photo background */}
      <section className="pf-showcase">
        <div className="pf-wallpapers" aria-hidden="true">
          {wallpapers.map((image, index) => (
            <div
              key={image}
              className={`pf-wallpaper ${
                wallpaperIndex === index ? "pf-wallpaper-active" : ""
              }`}
              style={{ backgroundImage: `url("${image}")` }}
            />
          ))}
        </div>

        <div className="pf-photo-shade" />

        <Link to="/login" className="pf-brand pf-brand-light">
          <span className="pf-brand-icon">P</span>
          <span className="pf-brand-copy">
            <strong>PARCELFLOW</strong>
            <small>PARCEL SYSTEM</small>
          </span>
        </Link>

        <div className="pf-showcase-content">
          <div className="pf-kicker">
            <span className="pf-kicker-dot" />
            DELIVERY, WITHOUT THE GUESSWORK
          </div>

          <h1>
            Moving parcels.
            <br />
            <span>Building trust.</span>
          </h1>

          <p className="pf-showcase-description">
            A simpler way to manage deliveries, keep track of parcels and
            bring every delivery a step closer to its destination.
          </p>

          <div className="pf-benefits">
            <div className="pf-benefit">
              <span className="pf-benefit-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 7h11v11H3zM14 11h4l3 3v4h-7"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <circle cx="7" cy="19" r="2" stroke="currentColor" strokeWidth="1.7" />
                  <circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              </span>
              <span>
                <strong>Delivery management</strong>
                <small>Keep parcel operations organised.</small>
              </span>
            </div>

            <div className="pf-benefit">
              <span className="pf-benefit-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
                </svg>
              </span>
              <span>
                <strong>Parcel tracking</strong>
                <small>Check delivery progress with ease.</small>
              </span>
            </div>

            <div className="pf-benefit">
              <span className="pf-benefit-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m9 12 2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>
                <strong>Account security</strong>
                <small>Your access stays personal.</small>
              </span>
            </div>
          </div>
        </div>

        <div className="pf-showcase-footer">
          <span>FROM COLLECTION TO DESTINATION</span>
          <div className="pf-slide-indicators" aria-label={`Photo ${wallpaperIndex + 1} of ${wallpapers.length}`}>
            {wallpapers.map((image, index) => (
              <span
                key={image}
                className={index === wallpaperIndex ? "pf-indicator-active" : ""}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Login form */}
      <section className="pf-login-side">
        <header className="pf-mobile-brand">
          <span className="pf-brand-icon">P</span>
          <span className="pf-brand-copy">
            <strong>ParcelFlow</strong>
            <small>PARCEL MANAGEMENT</small>
          </span>
        </header>

        <div className="pf-login-card">
          <div className="pf-form-eyebrow">ACCOUNT ACCESS</div>

          <h2>Welcome back.</h2>
          <p className="pf-form-intro">
            Sign in to continue to your ParcelFlow account.
          </p>

          {error && (
            <div className="pf-error" role="alert">
              <span className="pf-error-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="pf-field">
              <label htmlFor="pf-email">Email address</label>

              <div className="pf-input-frame">
                <span className="pf-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="m4 7 8 6 8-6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <input
                  id="pf-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="pf-field">
              <div className="pf-password-heading">
                <label htmlFor="pf-password">Password</label>
                <Link to="/forgot-password" className="pf-forgot-link">
                  Forgot password?
                </Link>
              </div>

              {/* Input and button deliberately share ONE grid frame */}
              <div className="pf-input-frame pf-password-frame">
                <span className="pf-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 10V7a4 4 0 0 1 8 0v3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="15" r="1.2" fill="currentColor" />
                  </svg>
                </span>

                <input
                  id="pf-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="pf-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              className="pf-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="pf-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span className="pf-submit-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          <div className="pf-form-divider">
            <span />
            <small>YOUR DELIVERIES, IN ONE PLACE</small>
            <span />
          </div>

          <p className="pf-register">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>

          <div className="pf-security-note">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Secure access to your account
          </div>
        </div>

        <footer className="pf-login-footer">
          <span>© {new Date().getFullYear()} ParcelFlow</span>
          <span>Simple. Reliable. Connected.</span>
        </footer>
      </section>
    </main>
  );
}