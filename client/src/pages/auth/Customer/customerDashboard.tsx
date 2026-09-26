import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerDashboard.css";

interface Parcel {
  id: number;
  trackingNumber: string;
  receiverName: string;
  deliveryAddress: string;
  deliveryType: string;
  weight: number;
  price: number;
  status: string;
  createdAt: string;
}

interface Payment {
  id: number;
  amount: number;
  method: string;
  status: string;
  transactionId?: string | null;
  mpesaReceiptNumber?: string | null;
  createdAt: string;
  parcel?: {
    trackingNumber: string;
  };
}

interface DashboardData {
  statistics: {
    totalParcels: number;
    activeParcels: number;
    deliveredParcels: number;
    pendingParcels: number;
  };
  recentParcels: Parcel[];
  payments?: Payment[];
}

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!savedUser || !token) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    loadDashboard(token);
  }, [navigate]);

  const loadDashboard = async (token: string) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/customer/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        throw new Error(
          data.message || "Unable to load dashboard."
        );
      }

      setDashboard(data);
    } catch (error) {
      console.error(error);

      if (error instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please make sure the backend is running."
        );
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to load dashboard.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "status delivered";

      case "IN_TRANSIT":
      case "OUT_FOR_DELIVERY":
      case "PICKED_UP":
        return "status active";

      case "CANCELLED":
      case "DELIVERY_FAILED":
      case "RETURNED":
        return "status cancelled";

      default:
        return "status pending";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(
      "en-KE",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      {/* SIDEBAR */}

      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            📦
          </div>

          <div>
            <h2>Parcel Management System</h2>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item active"
            onClick={() =>
              navigate("/customer/dashboard")
            }
          >
            <span>🏠</span>
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() =>
              navigate("/customer/create-parcel")
            }
          >
            <span>➕</span>
            Create Parcel
          </button>

          <button
            className="nav-item"
            onClick={() =>
              navigate("/customer/my-parcels")
            }
          >
            <span>📦</span>
            My Parcels
          </button>

          <button
            className="nav-item"
            onClick={() =>
              navigate("/customer/track-parcel")
            }
          >
            <span>🔍</span>
            Track Parcel
          </button>

          <button
            className="nav-item"
            onClick={() =>
              navigate("/customer/payment")
            }
          >
            <span>💳</span>
            Payments
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item logout-button"
            onClick={handleLogout}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>
              Welcome back,{" "}
              {user?.name || "Customer"} 👋
            </h1>

            <p>
              Manage and track your parcels from
              one place.
            </p>
          </div>

          <div className="header-profile">
            <div className="profile-avatar">
              {user?.name
                ?.charAt(0)
                .toUpperCase() || "U"}
            </div>

            <div>
              <strong>
                {user?.name || "Customer"}
              </strong>

              <span>Customer</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="dashboard-error">
            ⚠️ {error}
          </div>
        )}

        {/* STATISTICS */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              📦
            </div>

            <div>
              <span>Total Parcels</span>
              <strong>
                {dashboard?.statistics
                  .totalParcels || 0}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              🚚
            </div>

            <div>
              <span>Active Deliveries</span>
              <strong>
                {dashboard?.statistics
                  .activeParcels || 0}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon delivered">
              ✅
            </div>

            <div>
              <span>Delivered</span>
              <strong>
                {dashboard?.statistics
                  .deliveredParcels || 0}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              ⏳
            </div>

            <div>
              <span>Pending</span>
              <strong>
                {dashboard?.statistics
                  .pendingParcels || 0}
              </strong>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}

        <section className="quick-actions">
          <div>
            <h2>Quick Actions</h2>
            <p>
              What would you like to do today?
            </p>
          </div>

          <div className="action-buttons">
            <button
              className="action-card primary"
              onClick={() =>
                navigate("/customer/create-parcel")
              }
            >
              <span>📦</span>

              <div>
                <strong>
                  Create a Parcel
                </strong>

                <small>
                  Send a new package
                </small>
              </div>

              <b>→</b>
            </button>

            <button
              className="action-card"
              onClick={() =>
                navigate("/customer/track-parcel")
              }
            >
              <span>🔍</span>

              <div>
                <strong>
                  Track a Parcel
                </strong>

                <small>
                  Check delivery status
                </small>
              </div>

              <b>→</b>
            </button>

            <button
              className="action-card"
              onClick={() =>
                navigate("/customer/payment")
              }
            >
              <span>💳</span>

              <div>
                <strong>
                  Make a Payment
                </strong>

                <small>
                  Pay for your parcel
                </small>
              </div>

              <b>→</b>
            </button>
          </div>
        </section>

        {/* RECENT PARCELS */}

        <section className="recent-section">
          <div className="section-heading">
            <div>
              <h2>Recent Parcels</h2>
              <p>
                Your latest parcel activity
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/customer/my-parcels")
              }
            >
              View All →
            </button>
          </div>

          <div className="parcel-table-wrapper">
            {dashboard?.recentParcels &&
            dashboard.recentParcels.length > 0 ? (
              <table className="parcel-table">
                <thead>
                  <tr>
                    <th>Tracking Number</th>
                    <th>Receiver</th>
                    <th>Destination</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.recentParcels.map(
                    (parcel) => (
                      <tr key={parcel.id}>
                        <td>
                          <strong className="tracking-number">
                            {parcel.trackingNumber}
                          </strong>
                        </td>

                        <td>
                          {parcel.receiverName}
                        </td>

                        <td>
                          <span className="destination">
                            📍 {parcel.deliveryAddress}
                          </span>
                        </td>

                        <td>
                          {parcel.deliveryType}
                        </td>

                        <td>
                          KES{" "}
                          {parcel.price.toLocaleString(
                            "en-KE",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              parcel.status
                            )}
                          >
                            {formatStatus(
                              parcel.status
                            )}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            parcel.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            ) : (
              <div className="empty-parcels">
                <div>📦</div>

                <h3>
                  No parcels yet
                </h3>

                <p>
                  You haven't created any
                  parcels yet.
                </p>

                <button
                  onClick={() =>
                    navigate(
                      "/customer/create-parcel"
                    )
                  }
                >
                  Create Your First Parcel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* PAYMENT HISTORY */}

        <section className="recent-section">
          <div className="section-heading">
            <div>
              <h2>Recent Payments</h2>

              <p>
                Your latest payment activity
              </p>
            </div>

            <button
              onClick={() =>
                navigate("/customer/payment")
              }
            >
              View Payments →
            </button>
          </div>

          <div className="parcel-table-wrapper">
            {dashboard?.payments &&
            dashboard.payments.length > 0 ? (
              <table className="parcel-table">
                <thead>
                  <tr>
                    <th>Tracking Number</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Transaction</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.payments.map(
                    (payment) => (
                      <tr key={payment.id}>
                        <td>
                          <strong className="tracking-number">
                            {payment.parcel
                              ?.trackingNumber ||
                              "N/A"}
                          </strong>
                        </td>

                        <td>
                          KES{" "}
                          {payment.amount.toLocaleString(
                            "en-KE",
                            {
                              minimumFractionDigits: 2,
                            }
                          )}
                        </td>

                        <td>
                          {payment.method
                            .replaceAll("_", " ")
                            .toLowerCase()
                            .replace(
                              /\b\w/g,
                              (letter) =>
                                letter.toUpperCase()
                            )}
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              payment.status
                            )}
                          >
                            {formatStatus(
                              payment.status
                            )}
                          </span>
                        </td>

                        <td>
                          {payment.mpesaReceiptNumber ||
                            payment.transactionId ||
                            "N/A"}
                        </td>

                        <td>
                          {formatDate(
                            payment.createdAt
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            ) : (
              <div className="empty-parcels">
                <div>💳</div>

                <h3>
                  No payments yet
                </h3>

                <p>
                  Your payment history will
                  appear here.
                </p>

                <button
                  onClick={() =>
                    navigate(
                      "/customer/payment"
                    )
                  }
                >
                  Make a Payment
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SECURITY NOTICE */}

        <div className="security-notice">
          <span>🔒</span>

          <div>
            <strong>
              Your information is protected
            </strong>

            <p>
              Your parcel information is securely
              managed by Parcel Management System.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;