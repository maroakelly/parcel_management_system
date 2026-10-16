import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const configuredApiUrl = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_BASE_URL = configuredApiUrl.endsWith("/api")
  ? configuredApiUrl.slice(0, -4)
  : configuredApiUrl;

interface PricingSettings {
  pricePerKg: number;
  expressMultiplier: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [pricing, setPricing] = useState<PricingSettings>({
    pricePerKg: 50,
    expressMultiplier: 1.5,
  });

  const [newPrice, setNewPrice] = useState("50");
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [savingPrice, setSavingPrice] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Existing pricing API logic preserved.
  useEffect(() => {
    const loadPricing = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("Please log in to manage parcel pricing.");
        setLoadingPrice(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/pricing`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Could not load pricing settings."
          );
        }

        const settings = data.pricing;

        if (settings) {
          setPricing({
            pricePerKg: Number(settings.pricePerKg),
            expressMultiplier: Number(
              settings.expressMultiplier ?? 1.5
            ),
          });

          setNewPrice(String(settings.pricePerKg));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load pricing settings."
        );
      } finally {
        setLoadingPrice(false);
      }
    };

    loadPricing();
  }, []);

  // Existing save-price logic preserved.
  const handleSavePrice = async () => {
    setMessage("");
    setError("");

    const price = Number(newPrice);

    if (
      newPrice.trim() === "" ||
      !Number.isFinite(price) ||
      price < 1 ||
      price > 1_000_000
    ) {
      setError("Enter a valid price between 1 and 1,000,000.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError(
        "Your session has expired. Please log in again."
      );
      return;
    }

    setSavingPrice(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/pricing`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pricePerKg: price,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Could not update parcel pricing."
        );
      }

      const updatedSettings = data.pricing;

      setPricing((current) => ({
        ...current,
        pricePerKg: Number(
          updatedSettings?.pricePerKg ?? price
        ),
        expressMultiplier: Number(
          updatedSettings?.expressMultiplier ??
            current.expressMultiplier
        ),
      }));

      setNewPrice(
        String(updatedSettings?.pricePerKg ?? price)
      );

      setMessage(
        "Parcel price per kilogram updated successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update parcel pricing."
      );
    } finally {
      setSavingPrice(false);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* SIDEBAR */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <span>P</span>
          </div>

          <div>
            <h2>ParcelFlow</h2>
            <p>Parcel System</p>
          </div>
        </div>

        <div className="admin-sidebar-section">
          <p className="admin-menu-label">MAIN MENU</p>

          <nav className="admin-navigation">
            <button
              type="button"
              className="admin-nav-item active"
              onClick={() => navigate("/admin/dashboard")}
            >
              <span className="admin-nav-icon">▦</span>
              Dashboard
            </button>

            <button
              type="button"
              className="admin-nav-item"
              onClick={() => navigate("/admin/parcels")}
            >
              <span className="admin-nav-icon">□</span>
              Parcels
            </button>

            <button
              type="button"
              className="admin-nav-item"
              onClick={() => navigate("/admin/customers")}
            >
              <span className="admin-nav-icon">♙</span>
              Customers
            </button>

            <button
              type="button"
              className="admin-nav-item"
              onClick={() => navigate("/admin/drivers")}
            >
              <span className="admin-nav-icon">♧</span>
              Drivers
            </button>

            <button
              type="button"
              className="admin-nav-item"
              onClick={() => navigate("/admin/deliveries")}
            >
              <span className="admin-nav-icon">⇢</span>
              Deliveries
            </button>

            <button
              type="button"
              className="admin-nav-item"
              onClick={() => navigate("/admin/reports")}
            >
              <span className="admin-nav-icon">▤</span>
              Reports
            </button>
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <div className="admin-profile-info">
              <strong>Administrator</strong>
              <span>System Management</span>
            </div>
          </div>

          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN DASHBOARD */}
      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>Admin Dashboard</h1>
            <p>
              Welcome back. Manage your parcel operations here.
            </p>
          </div>

          <div className="admin-header-right">
            <div className="admin-header-status">
              <span className="admin-status-dot" />
              Administrator
            </div>
          </div>
        </header>

        <main className="admin-content">
          <section className="admin-welcome">
            <div>
              <span className="admin-eyebrow">
                PARCELFLOW MANAGEMENT
              </span>
              <h2>Welcome, Administrator</h2>
              <p>
                Access your management tools and parcel pricing
                settings from one place.
              </p>
            </div>

            <div className="admin-welcome-icon">📦</div>
          </section>

          <div className="admin-section-heading">
            <div>
              <h2>Management Centre</h2>
              <p>Select a section to manage your system.</p>
            </div>
          </div>

          <div className="admin-cards">
            {/* PARCELS */}
            <div className="admin-card">
              <div className="admin-card-top">
                <div className="admin-card-icon icon-blue">
                  📦
                </div>
                <span className="admin-card-number">01</span>
              </div>

              <h3>Parcels</h3>
              <p>
                Manage parcel records and access parcel
                management tools.
              </p>

              <button
                type="button"
                onClick={() => navigate("/admin/parcels")}
              >
                Manage Parcels <span>→</span>
              </button>
            </div>

            {/* CUSTOMERS */}
            <div className="admin-card">
              <div className="admin-card-top">
                <div className="admin-card-icon icon-purple">
                  👥
                </div>
                <span className="admin-card-number">02</span>
              </div>

              <h3>Customers</h3>
              <p>
                Access customer accounts and customer
                management tools.
              </p>

              <button
                type="button"
                onClick={() => navigate("/admin/customers")}
              >
                Manage Customers <span>→</span>
              </button>
            </div>

            {/* DRIVERS */}
            <div className="admin-card">
              <div className="admin-card-top">
                <div className="admin-card-icon icon-green">
                  🚚
                </div>
                <span className="admin-card-number">03</span>
              </div>

              <h3>Drivers</h3>
              <p>
                Manage existing drivers and register new
                delivery drivers.
              </p>

              <button
                type="button"
                onClick={() => navigate("/admin/drivers")}
              >
                Manage Drivers <span>→</span>
              </button>

              <button
                type="button"
                className="admin-secondary-button register-driver-dashboard-button"
                onClick={() =>
                  navigate("/admin/register-driver")
                }
              >
                + Register Driver
              </button>
            </div>

            {/* DELIVERIES */}
            <div className="admin-card delivery-admin-card">
              <div className="admin-card-top">
                <div className="admin-card-icon icon-orange">
                  🚛
                </div>
                <span className="admin-card-number">04</span>
              </div>

              <h3>Deliveries</h3>
              <p>
                Access delivery management tools and monitor
                parcel delivery operations.
              </p>

              <button
                type="button"
                className="delivery-dashboard-button"
                onClick={() =>
                  navigate("/admin/deliveries")
                }
              >
                Manage Deliveries <span>→</span>
              </button>
            </div>

            {/* REPORTS */}
            <div className="admin-card">
              <div className="admin-card-top">
                <div className="admin-card-icon icon-teal">
                  📊
                </div>
                <span className="admin-card-number">05</span>
              </div>

              <h3>Reports</h3>
              <p>
                Open the system reports section to review
                available reports.
              </p>

              <button
                type="button"
                onClick={() => navigate("/admin/reports")}
              >
                View Reports <span>→</span>
              </button>
            </div>

            {/* PARCEL PRICING: EXISTING FUNCTIONALITY */}
            <div className="admin-card pricing-admin-card">
              <div className="admin-card-top">
                <div className="admin-card-icon icon-gold">
                  💰
                </div>
                <span className="admin-card-number">06</span>
              </div>

              <h3>Parcel Pricing</h3>
              <p>
                Configure delivery charges per kilogram.
              </p>

              {loadingPrice ? (
                <div className="admin-loading">
                  <span className="admin-loading-spinner" />
                  Loading pricing settings...
                </div>
              ) : (
                <>
                  <div className="pricing-current">
                    <span>Current price per kg</span>
                    <strong>
                      KSh{" "}
                      {pricing.pricePerKg.toLocaleString(
                        "en-KE",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>
                  </div>

                  <div className="pricing-multiplier">
                    <span>Express delivery multiplier</span>
                    <strong>
                      {pricing.expressMultiplier}×
                    </strong>
                  </div>

                  <label htmlFor="pricePerKg">
                    New price per kilogram (KSh)
                  </label>

                  <input
                    id="pricePerKg"
                    type="number"
                    min="1"
                    max="1000000"
                    step="0.01"
                    value={newPrice}
                    onChange={(event) =>
                      setNewPrice(event.target.value)
                    }
                    placeholder="Enter price per kg"
                    disabled={savingPrice}
                  />

                  <button
                    type="button"
                    className="pricing-save-button"
                    onClick={handleSavePrice}
                    disabled={savingPrice}
                  >
                    {savingPrice
                      ? "Saving..."
                      : "Save Price"}
                    {!savingPrice && <span>→</span>}
                  </button>
                </>
              )}

              {message && (
                <p
                  role="status"
                  className="admin-message admin-success"
                >
                  {message}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="admin-message admin-error"
                >
                  {error}
                </p>
              )}
            </div>
          </div>

          <footer className="admin-footer">
            <span>ParcelFlow Management System</span>
            <span>Administration Portal</span>
          </footer>
        </main>
      </div>
    </div>
  );
}