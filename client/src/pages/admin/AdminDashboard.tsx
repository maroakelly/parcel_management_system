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

  // Load the current pricing settings from the backend.
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
            data.message || data.error || "Could not load pricing settings."
          );
        }

        const settings = data.pricing;

        if (settings) {
          setPricing({
            pricePerKg: Number(settings.pricePerKg),
            expressMultiplier: Number(settings.expressMultiplier ?? 1.5),
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

  // Save a new price per kilogram.
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
      setError("Your session has expired. Please log in again.");
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
          data.message || data.error || "Could not update parcel pricing."
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

      setMessage("Parcel price per kilogram updated successfully.");
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
      {/* HEADER */}
      <header className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>PARCEL FLOW</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      {/* CONTENT */}
      <main className="admin-content">
        <h2>Welcome, Administrator</h2>

        <div className="admin-cards">
          {/* PARCELS */}
          <div className="admin-card">
            <h3>📦 Parcels</h3>
            <p>Manage all parcels</p>

            <button onClick={() => navigate("/admin/parcels")}>
              Manage Parcels
            </button>
          </div>

          {/* CUSTOMERS */}
          <div className="admin-card">
            <h3>👥 Customers</h3>
            <p>Manage customer accounts</p>

            <button onClick={() => navigate("/admin/customers")}>
              Manage Customers
            </button>
          </div>

          {/* DRIVERS */}
          <div className="admin-card">
            <h3>🚚 Drivers</h3>
            <p>Manage and register delivery drivers</p>

            <button onClick={() => navigate("/admin/drivers")}>
              Manage Drivers
            </button>

            <button
              className="register-driver-dashboard-button"
              onClick={() => navigate("/admin/register-driver")}
            >
              + Register Driver
            </button>
          </div>

          {/* DELIVERIES */}
          <div className="admin-card delivery-admin-card">
            <h3>🚛 Delivery</h3>

            <p>Monitor and manage parcel deliveries</p>

            <button
              className="delivery-dashboard-button"
              onClick={() => navigate("/admin/deliveries")}
            >
              Manage Deliveries
            </button>
          </div>

          {/* REPORTS */}
          <div className="admin-card">
            <h3>📊 Reports</h3>
            <p>View system reports</p>

            <button onClick={() => navigate("/admin/reports")}>
              View Reports
            </button>
          </div>

          {/* PARCEL PRICING */}
          <div className="admin-card">
            <h3>💰 Parcel Pricing</h3>
            <p>Manage delivery charges per kilogram.</p>

            {loadingPrice ? (
              <p>Loading pricing settings...</p>
            ) : (
              <>
                <p>
                  Current price:{" "}
                  <strong>
                    KSh {pricing.pricePerKg.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    per kg
                  </strong>
                </p>

                <p>
                  Express delivery multiplier:{" "}
                  <strong>{pricing.expressMultiplier}×</strong>
                </p>

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
                  onChange={(event) => setNewPrice(event.target.value)}
                  placeholder="Enter price per kg"
                  disabled={savingPrice}
                />

                <button
                  type="button"
                  onClick={handleSavePrice}
                  disabled={savingPrice}
                >
                  {savingPrice ? "Saving..." : "Save Price"}
                </button>
              </>
            )}

            {message && (
              <p role="status" style={{ color: "green" }}>
                {message}
              </p>
            )}

            {error && (
              <p role="alert" style={{ color: "red" }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}