import { useCallback, useEffect, useState } from "react";
import "./DriverDashboard.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

type ParcelStatus =
  | "PENDING"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "RESCHEDULED"
  | "RETURNED"
  | "CANCELLED";

type Parcel = {
  id: number;
  trackingNumber: string;
  receiverName: string;
  receiverPhone?: string | null;
  pickupAddress: string;
  deliveryAddress: string;
  parcelType: string;
  weight: number;
  price: number;
  status: ParcelStatus;
  createdAt: string;
  updatedAt: string;
};

type DriverData = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  licenseNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  availability: boolean;
};

type DashboardData = {
  driver: DriverData;
  summary: {
    total: number;
    assigned: number;
    pickedUp: number;
    inTransit: number;
    outForDelivery: number;
    delivered: number;
    failed: number;
  };
  parcels: Parcel[];
};

const nextStatuses: Partial<Record<ParcelStatus, ParcelStatus[]>> = {
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["RESCHEDULED", "RETURNED"],
  RESCHEDULED: ["PICKED_UP"],
};

const statusLabels: Record<ParcelStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  DELIVERY_FAILED: "Delivery failed",
  RESCHEDULED: "Rescheduled",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export default function DriverDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [failureReasons, setFailureReasons] = useState<
    Record<number, string>
  >({});

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please sign in with your driver account.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/driver/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load your dashboard."
        );
      }

      setData(result as DashboardData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function updateStatus(
    parcel: Parcel,
    newStatus: ParcelStatus
  ) {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    let notes = "";

    if (newStatus === "DELIVERY_FAILED") {
      notes = (failureReasons[parcel.id] || "").trim();

      if (!notes) {
        setError("Enter the reason for the failed delivery first.");
        return;
      }
    }

    try {
      setUpdatingId(parcel.id);
      setError("");

      const response = await fetch(
        `${API_URL}/api/driver/parcels/${parcel.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus, notes }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update parcel status."
        );
      }

      setFailureReasons((previous) => ({
        ...previous,
        [parcel.id]: "",
      }));

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update delivery status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleAvailability() {
    if (!data || availabilitySaving) return;

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in again.");
      return;
    }

    try {
      setAvailabilitySaving(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/driver/availability`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            availability: !data.driver.availability,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update availability."
        );
      }

      setData((previous) =>
        previous
          ? {
              ...previous,
              driver: {
                ...previous.driver,
                availability: result.availability,
              },
            }
          : previous
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update availability."
      );
    } finally {
      setAvailabilitySaving(false);
    }
  }

  const visibleParcels =
    data?.parcels.filter(
      (parcel) =>
        filter === "ALL" || parcel.status === filter
    ) || [];

  if (loading) {
    return (
      <div className="driver-loading">
        <div className="driver-spinner" />
        <h2>Preparing your dashboard</h2>
        <p>Loading your delivery information...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="driver-page driver-error-page">
        <div className="driver-alert" role="alert">
          {error || "Unable to load your driver dashboard."}
        </div>
        <button
          className="driver-btn driver-btn-primary"
          type="button"
          onClick={() => {
            setLoading(true);
            void loadDashboard();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const firstName = data.driver.name.trim().split(/\s+/)[0] || "Driver";

  return (
    <div className="driver-app">
      <aside className="driver-sidebar">
        <a className="driver-brand" href="/driver/dashboard">
          <span className="driver-brand-icon">P</span>
          <span>
            <strong>ParcelFlow</strong>
            <small>Delivery management</small>
          </span>
        </a>

        <div className="driver-sidebar-label">WORKSPACE</div>

        <nav className="driver-nav" aria-label="Driver navigation">
          <a className="driver-nav-link active" href="#overview">
            <span>⌂</span> Dashboard
          </a>
          <a className="driver-nav-link" href="#deliveries">
            <span>▣</span> My Deliveries
          </a>
          <a className="driver-nav-link" href="#deliveries">
            <span>↻</span> Update Status
          </a>
          <a className="driver-nav-link" href="#availability">
            <span>◉</span> Availability
          </a>
          <a className="driver-nav-link" href="#profile">
            <span>♙</span> My Profile
          </a>
        </nav>

        <div className="driver-sidebar-bottom">
          <div className="driver-help-card">
            <span className="driver-help-icon">?</span>
            <strong>Need assistance?</strong>
            <p>Contact your administrator if you need help with a delivery.</p>
          </div>

          <button
            type="button"
            className="driver-logout"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.assign("/login");
            }}
          >
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>

      <main className="driver-main" id="overview">
        <header className="driver-topbar">
          <div className="driver-breadcrumb">
            Workspace <span>/</span> <strong>Dashboard</strong>
          </div>
          <button
            className="driver-refresh"
            type="button"
            disabled={updatingId !== null || availabilitySaving}
            onClick={() => {
              setLoading(true);
              void loadDashboard();
            }}
          >
            ↻ <span>Refresh data</span>
          </button>
        </header>

        <div className="driver-content">
          <section className="driver-welcome">
            <div>
              <div className="driver-eyebrow">DRIVER WORKSPACE</div>
              <h1>Good day, {firstName} <span>✦</span></h1>
              <p>Here is your delivery overview. Let’s make today count.</p>
            </div>

            <div className="driver-welcome-date">
              <span className="driver-date-icon">▦</span>
              <div>
                <strong>{new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                })}</strong>
                <small>{new Date().toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}</small>
              </div>
            </div>
          </section>

          {error && (
            <div className="driver-alert" role="alert">
              <span>!</span>
              <p>{error}</p>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}

          <section className="driver-hero">
            <div className="driver-hero-content">
              <span className="driver-hero-tag">
                YOUR JOURNEY, YOUR IMPACT
              </span>
              <h2>Every delivery<br />makes a difference.</h2>
              <p>
                Deliver with care, keep your status updated,
                and help every customer stay informed.
              </p>
              <a href="#deliveries" className="driver-hero-button">
                View my deliveries <span>→</span>
              </a>
            </div>
            <div className="driver-hero-art" aria-hidden="true">
              <span className="driver-art-circle">P</span>
              <span className="driver-art-route">················</span>
              <span className="driver-art-package">▣</span>
            </div>
          </section>

          <section className="driver-section-heading">
            <div>
              <h2>Delivery overview</h2>
              <p>Your parcel activity at a glance</p>
            </div>
            <span className="driver-live-label">
              <i /> Live account data
            </span>
          </section>

          <section className="driver-stats">
            <article className="driver-stat-card stat-blue">
              <div className="driver-stat-top">
                <span className="driver-stat-icon">▣</span>
                <span className="driver-stat-caption">All time</span>
              </div>
              <p>Total parcels</p>
              <strong>{data.summary.total}</strong>
              <small>Assigned to you</small>
            </article>

            <article className="driver-stat-card stat-orange">
              <div className="driver-stat-top">
                <span className="driver-stat-icon">◷</span>
                <span className="driver-stat-caption">Action needed</span>
              </div>
              <p>Assigned</p>
              <strong>{data.summary.assigned}</strong>
              <small>Ready for pickup</small>
            </article>

            <article className="driver-stat-card stat-purple">
              <div className="driver-stat-top">
                <span className="driver-stat-icon">➜</span>
                <span className="driver-stat-caption">In progress</span>
              </div>
              <p>In transit</p>
              <strong>{data.summary.inTransit}</strong>
              <small>Currently on the way</small>
            </article>

            <article className="driver-stat-card stat-green">
              <div className="driver-stat-top">
                <span className="driver-stat-icon">✓</span>
                <span className="driver-stat-caption">Completed</span>
              </div>
              <p>Delivered</p>
              <strong>{data.summary.delivered}</strong>
              <small>Successfully delivered</small>
            </article>
          </section>

          <section className="driver-workspace">
            <div className="driver-primary-column">
              <section className="driver-panel" id="deliveries">
                <div className="driver-panel-heading">
                  <div>
                    <h2>My assigned deliveries</h2>
                    <p>Manage your parcels and delivery progress.</p>
                  </div>
                  <span className="driver-count">
                    {visibleParcels.length} parcels
                  </span>
                </div>

                <div className="driver-filters">
                  <label htmlFor="parcel-filter">Filter by status</label>
                  <select
                    id="parcel-filter"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                  >
                    <option value="ALL">All deliveries</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="PICKED_UP">Picked up</option>
                    <option value="IN_TRANSIT">In transit</option>
                    <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="DELIVERY_FAILED">Delivery failed</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                    <option value="RETURNED">Returned</option>
                  </select>
                </div>

                {visibleParcels.length === 0 ? (
                  <div className="driver-empty">
                    <span>▣</span>
                    <h3>No deliveries found</h3>
                    <p>
                      {filter === "ALL"
                        ? "New parcels assigned to you will appear here."
                        : "No parcels currently match this status filter."}
                    </p>
                  </div>
                ) : (
                  <div className="driver-parcel-list">
                    {visibleParcels.map((parcel) => {
                      const availableStatuses =
                        nextStatuses[parcel.status] || [];

                      return (
                        <article
                          className="driver-parcel"
                          key={parcel.id}
                        >
                          <div className="driver-parcel-heading">
                            <div className="driver-parcel-symbol">▣</div>
                            <div className="driver-parcel-title">
                              <strong>{parcel.trackingNumber}</strong>
                              <span>
                                {parcel.parcelType} · {parcel.weight} kg
                              </span>
                            </div>
                            <span
                              className={`driver-status driver-status-${parcel.status.toLowerCase()}`}
                            >
                              {statusLabels[parcel.status]}
                            </span>
                          </div>

                          <div className="driver-route">
                            <div className="driver-route-point">
                              <span className="route-dot route-pickup" />
                              <div>
                                <small>PICKUP LOCATION</small>
                                <p>{parcel.pickupAddress}</p>
                              </div>
                            </div>
                            <div className="driver-route-line" />
                            <div className="driver-route-point">
                              <span className="route-dot route-destination" />
                              <div>
                                <small>DELIVERY DESTINATION</small>
                                <p>{parcel.deliveryAddress}</p>
                              </div>
                            </div>
                          </div>

                          <div className="driver-recipient">
                            <div>
                              <small>RECIPIENT</small>
                              <strong>
                                {parcel.receiverName || "Not provided"}
                              </strong>
                            </div>
                            {parcel.receiverPhone && (
                              <a href={`tel:${parcel.receiverPhone}`}>
                                ☎ Call recipient
                              </a>
                            )}
                          </div>

                          {availableStatuses.length > 0 ? (
                            <div className="driver-parcel-actions">
                              {availableStatuses.includes("DELIVERY_FAILED") && (
                                <label className="driver-failure-reason">
                                  Failure reason
                                  <input
                                    type="text"
                                    maxLength={500}
                                    placeholder="Enter reason if delivery fails"
                                    value={failureReasons[parcel.id] || ""}
                                    onChange={(event) =>
                                      setFailureReasons((previous) => ({
                                        ...previous,
                                        [parcel.id]: event.target.value,
                                      }))
                                    }
                                  />
                                </label>
                              )}

                              {availableStatuses.map((status) => (
                                <button
                                  className="driver-btn driver-btn-primary"
                                  key={status}
                                  type="button"
                                  disabled={updatingId !== null}
                                  onClick={() =>
                                    void updateStatus(parcel, status)
                                  }
                                >
                                  {updatingId === parcel.id
                                    ? "Updating..."
                                    : `Mark ${statusLabels[status]}`}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="driver-no-action">
                              {parcel.status === "DELIVERED"
                                ? "✓ Delivery completed"
                                : "No further status actions available"}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside className="driver-secondary-column">
              <section className="driver-panel driver-profile" id="profile">
                <div className="driver-profile-cover">
                  <span>DRIVER PROFILE</span>
                  <div className="driver-avatar">
                    {data.driver.name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("")}
                  </div>
                </div>

                <div className="driver-profile-name">
                  <h2>{data.driver.name}</h2>
                  <p>{data.driver.email}</p>
                  <span
                    className={
                      data.driver.availability
                        ? "driver-online"
                        : "driver-offline"
                    }
                  >
                    <i />
                    {data.driver.availability
                      ? "Available for work"
                      : "Currently busy"}
                  </span>
                </div>

                <div className="driver-profile-details">
                  <div>
                    <span>Phone</span>
                    <strong>{data.driver.phone || "Not provided"}</strong>
                  </div>
                  <div>
                    <span>Vehicle</span>
                    <strong>{data.driver.vehicleType}</strong>
                  </div>
                  <div>
                    <span>Registration</span>
                    <strong>{data.driver.vehicleNumber}</strong>
                  </div>
                  <div>
                    <span>License number</span>
                    <strong>{data.driver.licenseNumber}</strong>
                  </div>
                </div>

                <div className="driver-availability" id="availability">
                  <div>
                    <strong>Availability</strong>
                    <p>Let your team know your status.</p>
                  </div>
                  <button
                    type="button"
                    className={`driver-toggle ${data.driver.availability ? "is-on" : ""}`}
                    role="switch"
                    aria-checked={data.driver.availability}
                    aria-label="Toggle driver availability"
                    disabled={availabilitySaving}
                    onClick={() => void toggleAvailability()}
                  >
                    <span />
                  </button>
                </div>
                <p className="driver-availability-note">
                  {availabilitySaving
                    ? "Saving your status..."
                    : data.driver.availability
                      ? "You are marked as available."
                      : "You are marked as unavailable."}
                </p>
              </section>

              <section className="driver-panel driver-progress">
                <div className="driver-panel-heading">
                  <div>
                    <h2>Delivery progress</h2>
                    <p>Your current workload</p>
                  </div>
                  <span className="driver-progress-icon">↗</span>
                </div>

                <div className="driver-progress-number">
                  <strong>
                    {data.summary.total > 0
                      ? Math.round(
                          (data.summary.delivered / data.summary.total) * 100
                        )
                      : 0}
                    %
                  </strong>
                  <span>of assigned parcels delivered</span>
                </div>

                <div
                  className="driver-progress-track"
                  role="progressbar"
                  aria-label="Delivered parcels percentage"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    data.summary.total > 0
                      ? Math.round(
                          (data.summary.delivered / data.summary.total) * 100
                        )
                      : 0
                  }
                >
                  <span
                    style={{
                      width: `${
                        data.summary.total > 0
                          ? Math.min(
                              100,
                              (data.summary.delivered / data.summary.total) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="driver-progress-row">
                  <span><i className="progress-green" /> Delivered</span>
                  <strong>{data.summary.delivered}</strong>
                </div>
                <div className="driver-progress-row">
                  <span><i className="progress-orange" /> Out for delivery</span>
                  <strong>{data.summary.outForDelivery}</strong>
                </div>
                <div className="driver-progress-row">
                  <span><i className="progress-purple" /> In transit</span>
                  <strong>{data.summary.inTransit}</strong>
                </div>
                <div className="driver-progress-row">
                  <span><i className="progress-red" /> Failed</span>
                  <strong>{data.summary.failed}</strong>
                </div>
              </section>

              <section className="driver-tip">
                <span>✦</span>
                <h3>Every parcel matters</h3>
                <p>
                  Verify the delivery details and update each parcel status
                  promptly to keep your team informed.
                </p>
              </section>
            </aside>
          </section>

          <footer className="driver-footer">
            <span>© {new Date().getFullYear()} ParcelFlow</span>
            <span>Delivering with care, every step of the way.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}