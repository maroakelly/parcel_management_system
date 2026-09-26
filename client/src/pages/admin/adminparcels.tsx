import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminParcels.css";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
}

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

interface Parcel {
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
  customer: Customer;
  driver?: Driver | null;
}

const statuses = [
  "ALL",
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

function AdminParcels() {
  const navigate = useNavigate();

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedParcel, setSelectedParcel] =
    useState<Parcel | null>(null);

  const [selectedDriver, setSelectedDriver] =
    useState("");

  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [parcelResponse, driverResponse] =
        await Promise.all([
          fetch(
            `${import.meta.env.VITE_API_URL}/api/admin/parcels`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          ),

          fetch(
            `${import.meta.env.VITE_API_URL}/api/admin/drivers`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          ),
        ]);

      const parcelData = await parcelResponse.json();
      const driverData = await driverResponse.json();

      if (!parcelResponse.ok) {
        throw new Error(
          parcelData.message ||
            "Unable to load parcels."
        );
      }

      if (!driverResponse.ok) {
        throw new Error(
          driverData.message ||
            "Unable to load drivers."
        );
      }

      setParcels(parcelData.parcels || []);
      setDrivers(driverData.drivers || []);
    } catch (err) {
      console.error(
        "Load admin parcel data:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to load parcel data."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredParcels = useMemo(() => {
    const searchValue = search
      .trim()
      .toLowerCase();

    return parcels.filter((parcel) => {
      const matchesSearch =
        !searchValue ||
        parcel.trackingNumber
          .toLowerCase()
          .includes(searchValue) ||
        parcel.customer.name
          .toLowerCase()
          .includes(searchValue) ||
        parcel.customer.email
          .toLowerCase()
          .includes(searchValue) ||
        parcel.receiverName
          .toLowerCase()
          .includes(searchValue) ||
        parcel.pickupAddress
          .toLowerCase()
          .includes(searchValue) ||
        parcel.deliveryAddress
          .toLowerCase()
          .includes(searchValue) ||
        (parcel.driver?.user.name
          .toLowerCase()
          .includes(searchValue) ??
          false);

      const matchesStatus =
        statusFilter === "ALL" ||
        parcel.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [parcels, search, statusFilter]);

  const formatStatus = (status: string) => {
    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const openParcelDetails = (
    parcel: Parcel
  ) => {
    setSelectedParcel(parcel);

    setSelectedDriver(
      parcel.driver
        ? String(parcel.driver.id)
        : ""
    );
  };

  const closeDetails = () => {
    setSelectedParcel(null);
    setSelectedDriver("");
  };

  const assignDriver = async () => {
    if (
      !selectedParcel ||
      !selectedDriver
    ) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/parcels/${selectedParcel.id}/assign-driver`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            driverId: Number(
              selectedDriver
            ),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to assign driver."
        );
      }

      setParcels((current) =>
        current.map((parcel) =>
          parcel.id === data.parcel.id
            ? data.parcel
            : parcel
        )
      );

      setSelectedParcel(data.parcel);

      alert(
        "Driver assigned successfully."
      );
    } catch (err) {
      console.error(
        "Assign driver error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to assign driver."
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (
    newStatus: string
  ) => {
    if (!selectedParcel) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/parcels/${selectedParcel.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to update parcel status."
        );
      }

      setParcels((current) =>
        current.map((parcel) =>
          parcel.id === data.parcel.id
            ? data.parcel
            : parcel
        )
      );

      setSelectedParcel(data.parcel);
    } catch (err) {
      console.error(
        "Update status error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to update parcel status."
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  const deleteParcel = async (
    parcel: Parcel
  ) => {
    const confirmed = window.confirm(
      `Delete parcel ${parcel.trackingNumber}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setUpdating(true);
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/parcels/${parcel.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to delete parcel."
        );
      }

      setParcels((current) =>
        current.filter(
          (item) =>
            item.id !== parcel.id
        )
      );

      if (
        selectedParcel?.id ===
        parcel.id
      ) {
        closeDetails();
      }
    } catch (err) {
      console.error(
        "Delete parcel error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to delete parcel."
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="admin-parcels-page">
      <header className="admin-parcels-header">
        <div>
          <h1>Parcel Management</h1>

          <p>
            View, manage, assign and monitor
            all parcels.
          </p>
        </div>

        <button
          type="button"
          className="back-dashboard-button"
          onClick={() =>
            navigate("/admin/dashboard")
          }
        >
          ← Back to Dashboard
        </button>
      </header>

      {error && (
        <div className="admin-parcels-error">
          ⚠️ {error}
        </div>
      )}

      <section className="parcel-controls">
        <div className="parcel-search">
          <label htmlFor="parcelSearch">
            Search Parcels
          </label>

          <input
            id="parcelSearch"
            type="text"
            placeholder="Tracking number, customer, receiver, driver or address..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>

        <div className="parcel-filter">
          <label htmlFor="statusFilter">
            Filter by Status
          </label>

          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            {statuses.map((status) => (
              <option
                key={status}
                value={status}
              >
                {status === "ALL"
                  ? "All Statuses"
                  : formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="refresh-parcels-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : "↻ Refresh"}
        </button>
      </section>

      <div className="parcel-summary">
        Showing{" "}
        <strong>
          {filteredParcels.length}
        </strong>{" "}
        of{" "}
        <strong>{parcels.length}</strong>{" "}
        parcels
      </div>

      {loading ? (
        <div className="admin-parcels-message">
          <h2>Loading parcels...</h2>
          <p>
            Please wait while the system
            retrieves parcel information.
          </p>
        </div>
      ) : filteredParcels.length ===
        0 ? (
        <div className="admin-parcels-message">
          <h2>No parcels found</h2>

          <p>
            No parcels match your current
            search or filter.
          </p>
        </div>
      ) : (
        <div className="admin-parcels-table-wrapper">
          <table className="admin-parcels-table">
            <thead>
              <tr>
                <th>
                  Tracking Number
                </th>
                <th>Customer</th>
                <th>Receiver</th>
                <th>Destination</th>
                <th>Delivery</th>
                <th>Price</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredParcels.map(
                (parcel) => (
                  <tr key={parcel.id}>
                    <td>
                      <strong>
                        {
                          parcel.trackingNumber
                        }
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {
                          parcel.customer
                            .name
                        }
                      </strong>

                      <br />

                      <small>
                        {
                          parcel.customer
                            .email
                        }
                      </small>
                    </td>

                    <td>
                      {
                        parcel.receiverName
                      }
                    </td>

                    <td>
                      {
                        parcel.deliveryAddress
                      }
                    </td>

                    <td>
                      <span
                        className={`delivery-type ${parcel.deliveryType.toLowerCase()}`}
                      >
                        {
                          parcel.deliveryType
                        }
                      </span>
                    </td>

                    <td>
                      KES{" "}
                      {parcel.price.toLocaleString()}
                    </td>

                    <td>
                      <span
                        className={`parcel-status ${parcel.status.toLowerCase()}`}
                      >
                        {formatStatus(
                          parcel.status
                        )}
                      </span>
                    </td>

                    <td>
                      {parcel.driver ? (
                        <>
                          <strong>
                            {
                              parcel
                                .driver
                                .user
                                .name
                            }
                          </strong>

                          <br />

                          <small>
                            {
                              parcel
                                .driver
                                .vehicleNumber
                            }
                          </small>
                        </>
                      ) : (
                        "Unassigned"
                      )}
                    </td>

                    <td>
                      <div className="parcel-action-buttons">
                        <button
                          type="button"
                          className="view-parcel-button"
                          onClick={() =>
                            openParcelDetails(
                              parcel
                            )
                          }
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="delete-parcel-button"
                          onClick={() =>
                            deleteParcel(
                              parcel
                            )
                          }
                          disabled={updating}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedParcel && (
        <div
          className="parcel-modal-overlay"
          onClick={closeDetails}
        >
          <div
            className="parcel-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="parcel-modal-header">
              <div>
                <h2>
                  Parcel Details
                </h2>

                <p>
                  {
                    selectedParcel.trackingNumber
                  }
                </p>
              </div>

              <button
                type="button"
                className="close-modal-button"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            <div className="parcel-details-grid">
              <div>
                <span>Customer</span>
                <strong>
                  {
                    selectedParcel
                      .customer.name
                  }
                </strong>
              </div>

              <div>
                <span>
                  Customer Email
                </span>
                <strong>
                  {
                    selectedParcel
                      .customer.email
                  }
                </strong>
              </div>

              <div>
                <span>Customer Phone</span>
                <strong>
                  {
                    selectedParcel
                      .customer.phone ||
                    "Not provided"
                  }
                </strong>
              </div>

              <div>
                <span>Receiver</span>
                <strong>
                  {
                    selectedParcel
                      .receiverName
                  }
                </strong>
              </div>

              <div>
                <span>
                  Receiver Phone
                </span>
                <strong>
                  {
                    selectedParcel
                      .receiverPhone
                  }
                </strong>
              </div>

              <div>
                <span>Pickup Address</span>
                <strong>
                  {
                    selectedParcel
                      .pickupAddress
                  }
                </strong>
              </div>

              <div>
                <span>
                  Delivery Address
                </span>
                <strong>
                  {
                    selectedParcel
                      .deliveryAddress
                  }
                </strong>
              </div>

              <div>
                <span>Parcel Type</span>
                <strong>
                  {
                    selectedParcel
                      .parcelType
                  }
                </strong>
              </div>

              <div>
                <span>Weight</span>
                <strong>
                  {selectedParcel.weight} KG
                </strong>
              </div>

              <div>
                <span>Delivery Type</span>
                <strong>
                  {
                    selectedParcel
                      .deliveryType
                  }
                </strong>
              </div>

              <div>
                <span>Price</span>
                <strong>
                  KES{" "}
                  {selectedParcel.price.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>Current Status</span>
                <strong>
                  {formatStatus(
                    selectedParcel.status
                  )}
                </strong>
              </div>

              <div>
                <span>Assigned Driver</span>
                <strong>
                  {selectedParcel.driver
                    ? selectedParcel
                        .driver.user
                        .name
                    : "Not assigned"}
                </strong>
              </div>

              <div>
                <span>Vehicle</span>
                <strong>
                  {selectedParcel.driver
                    ? `${selectedParcel.driver.vehicleNumber} (${selectedParcel.driver.vehicleType})`
                    : "Not assigned"}
                </strong>
              </div>

              <div>
                <span>Created</span>
                <strong>
                  {new Date(
                    selectedParcel.createdAt
                  ).toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="parcel-management-section">
              <h3>
                Assign / Reassign Driver
              </h3>

              <div className="driver-assignment-row">
                <select
                  value={selectedDriver}
                  onChange={(event) =>
                    setSelectedDriver(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select a driver
                  </option>

                  {drivers.map(
                    (driver) => (
                      <option
                        key={driver.id}
                        value={driver.id}
                        disabled={
                          !driver.availability ||
                          driver.user.status !==
                            "ACTIVE"
                        }
                      >
                        {driver.user.name}{" "}
                        —{" "}
                        {
                          driver.vehicleNumber
                        }
                        {!driver.availability
                          ? " (Unavailable)"
                          : driver.user
                                .status !==
                              "ACTIVE"
                          ? " (Inactive)"
                          : ""}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={
                    assignDriver
                  }
                  disabled={
                    updating ||
                    !selectedDriver
                  }
                >
                  {updating
                    ? "Updating..."
                    : "Assign Driver"}
                </button>
              </div>
            </div>

            <div className="parcel-management-section">
              <h3>
                Update Parcel Status
              </h3>

              <div className="status-buttons">
                {statuses
                  .filter(
                    (status) =>
                      status !== "ALL"
                  )
                  .map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={
                        selectedParcel.status ===
                        status
                          ? "active-status"
                          : ""
                      }
                      disabled={
                        updating ||
                        selectedParcel.status ===
                          status
                      }
                      onClick={() =>
                        updateStatus(
                          status
                        )
                      }
                    >
                      {formatStatus(
                        status
                      )}
                    </button>
                  ))}
              </div>
            </div>

            <div className="parcel-modal-footer">
              <button
                type="button"
                className="modal-delete-button"
                onClick={() =>
                  deleteParcel(
                    selectedParcel
                  )
                }
                disabled={updating}
              >
                🗑 Delete Parcel
              </button>

              <button
                type="button"
                className="modal-close-button"
                onClick={
                  closeDetails
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

export default AdminParcels;