import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDrivers.css";

interface DriverUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt: string;
}

interface DriverParcel {
  id: number;
  trackingNumber: string;
  status: string;
}

interface Driver {
  id: number;
  userId: number;
  licenseNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  availability: boolean;
  createdAt: string;
  user: DriverUser;
  parcels: DriverParcel[];
}

function AdminDrivers() {
  const navigate = useNavigate();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDrivers = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/admin/drivers`,
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
          throw new Error(
            data.message || "Unable to load drivers."
          );
        }

        setDrivers(data.drivers || []);
      } catch (err) {
        console.error("Admin drivers error:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load drivers.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadDrivers();
  }, [navigate]);

  const handleDeleteDriver = async (driverId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this driver? This action cannot be undone."
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
      setError("");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/drivers/${driverId}`,
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
          data.message || "Unable to delete driver."
        );
      }

      setDrivers((currentDrivers) =>
        currentDrivers.filter(
          (driver) => driver.id !== driverId
        )
      );
    } catch (err) {
      console.error("Delete driver error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to delete driver.");
      }
    }
  };

  return (
    <div className="admin-drivers-page">
      <div className="admin-drivers-header">
        <div>
          <h1>Manage Delivery Drivers</h1>
          <p>
            View and manage delivery drivers in the system
          </p>
        </div>

        <div className="admin-driver-header-actions">
          <button
            type="button"
            className="register-driver-header-button"
            onClick={() =>
              navigate("/admin/register-driver")
            }
          >
            + Register Driver
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {loading && (
        <div className="admin-drivers-message">
          Loading drivers...
        </div>
      )}

      {error && (
        <div className="admin-drivers-error">
          ⚠️ {error}
        </div>
      )}

      {!loading &&
        !error &&
        drivers.length === 0 && (
          <div className="admin-drivers-message">
            <h2>No delivery drivers found</h2>
            <p>
              There are currently no registered delivery
              drivers.
            </p>

            <button
              type="button"
              className="register-driver-empty-button"
              onClick={() =>
                navigate("/admin/register-driver")
              }
            >
              + Register First Driver
            </button>
          </div>
        )}

      {!loading && drivers.length > 0 && (
        <div className="admin-drivers-table-wrapper">
          <table className="admin-drivers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>License Number</th>
                <th>Vehicle</th>
                <th>Availability</th>
                <th>Parcels</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <strong>{driver.user.name}</strong>
                  </td>

                  <td>{driver.user.email}</td>

                  <td>
                    {driver.user.phone ||
                      "Not provided"}
                  </td>

                  <td>{driver.licenseNumber}</td>

                  <td>
                    <strong>
                      {driver.vehicleNumber}
                    </strong>

                    <br />

                    <small>
                      {driver.vehicleType}
                    </small>
                  </td>

                  <td>
                    <span
                      className={`driver-availability ${
                        driver.availability
                          ? "available"
                          : "unavailable"
                      }`}
                    >
                      {driver.availability
                        ? "Available"
                        : "Unavailable"}
                    </span>
                  </td>

                  <td>
                    {driver.parcels
                      ? driver.parcels.length
                      : 0}
                  </td>

                  <td>
                    <span
                      className={`driver-status ${driver.user.status.toLowerCase()}`}
                    >
                      {driver.user.status}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="delete-driver-button"
                      onClick={() =>
                        handleDeleteDriver(driver.id)
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminDrivers;