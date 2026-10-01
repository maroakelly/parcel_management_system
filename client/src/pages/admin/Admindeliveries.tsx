import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admindeliveries.css";

interface DriverUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
}

interface Driver {
  id: number;
  licenseNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  availability: boolean;
  user: DriverUser;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
}

interface Delivery {
  id: number;
  trackingNumber: string;
  receiverName: string;
  receiverPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  parcelType: string;
  weight: number;
  deliveryType: string;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  driver?: Driver | null;
}

const statuses = [
  "PENDING",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RESCHEDULED",
  "RETURNED",
  "CANCELLED",
];

export default function AdminDeliveries() {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDelivery, setSelectedDelivery] =
    useState<Delivery | null>(null);

  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [deliveriesResponse, driversResponse] =
        await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/admin/parcels`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          fetch(`${import.meta.env.VITE_API_URL}/api/admin/drivers`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      const deliveriesData = await deliveriesResponse.json();
      const driversData = await driversResponse.json();

      if (!deliveriesResponse.ok) {
        throw new Error(
          deliveriesData.message ||
            "Failed to load deliveries"
        );
      }

      if (!driversResponse.ok) {
        throw new Error(
          driversData.message ||
            "Failed to load drivers"
        );
      }

      setDeliveries(deliveriesData.parcels || []);
      setDrivers(driversData.drivers || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load delivery information"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setSelectedDriver(
      delivery.driver
        ? String(delivery.driver.id)
        : ""
    );
    setSelectedStatus(delivery.status);
  };

  const assignDriver = async () => {
    if (!selectedDelivery) {
      return;
    }

    if (!selectedDriver) {
      alert("Please select a driver.");
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/parcels/${selectedDelivery.id}/assign-driver`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            driverId: Number(selectedDriver),
          }),
        }
      );

      const text = await response.text();

      let data: {
        message?: string;
        parcel?: Delivery;
      };

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Server response:", text);

        throw new Error(
          "The server returned an invalid response. Check that your API URL is correct."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to assign driver"
        );
      }

      alert(
        data.message || "Driver assigned successfully."
      );

      await fetchData();

      setSelectedDelivery(null);
      setSelectedDriver("");
    } catch (err) {
      console.error("Assign driver error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to assign driver"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!selectedDelivery || !selectedStatus) {
      return;
    }

    try {
      setActionLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/parcels/${selectedDelivery.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: selectedStatus,
          }),
        }
      );

      const text = await response.text();

      let data: {
        message?: string;
        parcel?: Delivery;
      };

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error("Server response:", text);

        throw new Error(
          "The server returned an invalid response. Check that your API URL is correct."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update status"
        );
      }

      alert(
        data.message ||
          "Delivery status updated successfully."
      );

      await fetchData();

      setSelectedDelivery(null);
    } catch (err) {
      console.error("Update status error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to update delivery status"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDeliveries = deliveries.filter(
    (delivery) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        delivery.trackingNumber
          .toLowerCase()
          .includes(searchValue) ||
        delivery.receiverName
          .toLowerCase()
          .includes(searchValue) ||
        delivery.customer.name
          .toLowerCase()
          .includes(searchValue) ||
        delivery.pickupAddress
          .toLowerCase()
          .includes(searchValue) ||
        delivery.deliveryAddress
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "ALL" ||
        delivery.status === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  const activeDeliveries = deliveries.filter(
    (delivery) =>
      delivery.status !== "DELIVERED" &&
      delivery.status !== "CANCELLED" &&
      delivery.status !== "RETURNED"
  ).length;

  const deliveredDeliveries = deliveries.filter(
    (delivery) => delivery.status === "DELIVERED"
  ).length;

  const failedDeliveries = deliveries.filter(
    (delivery) =>
      delivery.status === "DELIVERY_FAILED"
  ).length;

  const formatStatus = (status: string) => {
    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div className="admin-deliveries-page">

      <header className="admin-deliveries-header">
        <div>
          <h1>Delivery Management</h1>
          <p>
            Monitor and manage parcel deliveries
          </p>
        </div>

        <button
          className="back-dashboard-button"
          onClick={() =>
            navigate("/admin/dashboard")
          }
        >
          ← Dashboard
        </button>
      </header>

      {error && (
        <div className="admin-deliveries-error">
          {error}
        </div>
      )}

      <section className="delivery-summary-cards">

        <div className="delivery-summary-card">
          <span>Active Deliveries</span>
          <strong>{activeDeliveries}</strong>
        </div>

        <div className="delivery-summary-card">
          <span>Delivered</span>
          <strong>{deliveredDeliveries}</strong>
        </div>

        <div className="delivery-summary-card">
          <span>Failed</span>
          <strong>{failedDeliveries}</strong>
        </div>

        <div className="delivery-summary-card">
          <span>Total Deliveries</span>
          <strong>{deliveries.length}</strong>
        </div>

      </section>

      <section className="delivery-controls">

        <div className="delivery-search">
          <label>Search Deliveries</label>

          <input
            type="text"
            placeholder="Tracking number, customer, receiver or address..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="delivery-filter">
          <label>Status</label>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <button
          className="refresh-deliveries-button"
          onClick={fetchData}
        >
          Refresh
        </button>

      </section>

      <div className="delivery-result-count">
        Showing{" "}
        <strong>
          {filteredDeliveries.length}
        </strong>{" "}
        deliveries
      </div>

      {loading ? (
        <div className="admin-deliveries-message">
          <h2>Loading deliveries...</h2>
          <p>Please wait.</p>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="admin-deliveries-message">
          <h2>No deliveries found</h2>
          <p>
            Try changing your search or status filter.
          </p>
        </div>
      ) : (
        <div className="admin-deliveries-table-wrapper">

          <table className="admin-deliveries-table">

            <thead>
              <tr>
                <th>Tracking Number</th>
                <th>Customer</th>
                <th>Receiver</th>
                <th>Driver</th>
                <th>Delivery Type</th>
                <th>Status</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredDeliveries.map(
                (delivery) => (

                  <tr key={delivery.id}>

                    <td>
                      <strong>
                        {delivery.trackingNumber}
                      </strong>
                    </td>

                    <td>
                      {delivery.customer.name}
                    </td>

                    <td>
                      <strong>
                        {delivery.receiverName}
                      </strong>

                      <small>
                        {delivery.receiverPhone}
                      </small>
                    </td>

                    <td>
                      {delivery.driver ? (
                        <div>
                          <strong>
                            {delivery.driver.user.name}
                          </strong>

                          <small>
                            {
                              delivery.driver
                                .vehicleNumber
                            }
                          </small>
                        </div>
                      ) : (
                        <span className="unassigned-driver">
                          Not Assigned
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`delivery-type ${delivery.deliveryType.toLowerCase()}`}
                      >
                        {delivery.deliveryType}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`delivery-status ${delivery.status.toLowerCase()}`}
                      >
                        {formatStatus(
                          delivery.status
                        )}
                      </span>
                    </td>

                    <td>
                      KES{" "}
                      {delivery.price.toLocaleString()}
                    </td>

                    <td>
                      <button
                        className="manage-delivery-button"
                        onClick={() =>
                          openDelivery(delivery)
                        }
                      >
                        Manage
                      </button>
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>
      )}

      {selectedDelivery && (
        <div className="delivery-modal-overlay">

          <div className="delivery-modal">

            <div className="delivery-modal-header">

              <div>
                <h2>
                  Delivery Management
                </h2>

                <p>
                  {
                    selectedDelivery.trackingNumber
                  }
                </p>
              </div>

              <button
                className="close-delivery-modal"
                onClick={() =>
                  setSelectedDelivery(null)
                }
              >
                ×
              </button>

            </div>

            <div className="delivery-details">

              <div>
                <span>Customer</span>
                <strong>
                  {selectedDelivery.customer.name}
                </strong>
              </div>

              <div>
                <span>Receiver</span>
                <strong>
                  {selectedDelivery.receiverName}
                </strong>
              </div>

              <div>
                <span>Receiver Phone</span>
                <strong>
                  {selectedDelivery.receiverPhone}
                </strong>
              </div>

              <div>
                <span>Parcel Type</span>
                <strong>
                  {selectedDelivery.parcelType}
                </strong>
              </div>

              <div>
                <span>Weight</span>
                <strong>
                  {selectedDelivery.weight} kg
                </strong>
              </div>

              <div>
                <span>Delivery Type</span>
                <strong>
                  {selectedDelivery.deliveryType}
                </strong>
              </div>

              <div>
                <span>Price</span>
                <strong>
                  KES{" "}
                  {selectedDelivery.price.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>Current Status</span>
                <strong>
                  {formatStatus(
                    selectedDelivery.status
                  )}
                </strong>
              </div>

            </div>

            <div className="delivery-addresses">

              <div>
                <span>Pickup Address</span>
                <p>
                  {selectedDelivery.pickupAddress}
                </p>
              </div>

              <div>
                <span>Delivery Address</span>
                <p>
                  {selectedDelivery.deliveryAddress}
                </p>
              </div>

            </div>

            <section className="delivery-management-section">

              <h3>Assign Driver</h3>

              <div className="delivery-driver-row">

                <select
                  value={selectedDriver}
                  onChange={(e) =>
                    setSelectedDriver(
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select Driver
                  </option>

                  {drivers.map((driver) => (
                    <option
                      key={driver.id}
                      value={driver.id}
                    >
                      {driver.user.name} -{" "}
                      {driver.vehicleNumber}
                    </option>
                  ))}
                </select>

                <button
                  onClick={assignDriver}
                  disabled={actionLoading}
                >
                  Assign
                </button>

              </div>

            </section>

            <section className="delivery-management-section">

              <h3>Update Delivery Status</h3>

              <select
                className="delivery-status-select"
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(
                    e.target.value
                  )
                }
              >
                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <button
                className="update-delivery-status-button"
                onClick={updateStatus}
                disabled={actionLoading}
              >
                Update Status
              </button>

            </section>

            <div className="delivery-modal-footer">

              <button
                className="close-delivery-button"
                onClick={() =>
                  setSelectedDelivery(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}