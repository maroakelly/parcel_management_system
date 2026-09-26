import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

export default function AdminDashboard() {
const navigate = useNavigate();

const handleLogout = () => {
localStorage.removeItem("token");
localStorage.removeItem("user");
navigate("/login");
};

return (
<div className="admin-dashboard">

  {/* HEADER */}
  <header className="admin-header">
    <div>
      <h1>Admin Dashboard</h1>
      <p>Parcel Management System</p>
    </div>

    <button onClick={handleLogout}>
      Logout
    </button>
  </header>

  {/* CONTENT */}
  <main className="admin-content">

    <h2>Welcome, Administrator</h2>

    <div className="admin-cards">

      {/* PARCELS */}
      <div className="admin-card">
        <h3>📦 Parcels</h3>
        <p>Manage all parcels</p>

        <button
          onClick={() => navigate("/admin/parcels")}
        >
          Manage Parcels
        </button>
      </div>

      {/* CUSTOMERS */}
      <div className="admin-card">
        <h3>👥 Customers</h3>
        <p>Manage customer accounts</p>

        <button
          onClick={() => navigate("/admin/customers")}
        >
          Manage Customers
        </button>
      </div>

      {/* DRIVERS */}
      <div className="admin-card">
        <h3>🚚 Drivers</h3>
        <p>Manage and register delivery drivers</p>

        <button
          onClick={() => navigate("/admin/drivers")}
        >
          Manage Drivers
        </button>

        <button
          className="register-driver-dashboard-button"
          onClick={() =>
            navigate("/admin/register-driver")
          }
        >
          + Register Driver
        </button>
      </div>

      {/* DELIVERIES */}
      <div className="admin-card delivery-admin-card">
        <h3>🚛 Delivery</h3>

        <p>
          Monitor and manage parcel deliveries
        </p>

        <button
          className="delivery-dashboard-button"
          onClick={() =>
            navigate("/admin/deliveries")
          }
        >
          Manage Deliveries
        </button>
      </div>

      {/* REPORTS */}
      <div className="admin-card">
        <h3>📊 Reports</h3>
        <p>View system reports</p>

        <button
          onClick={() =>
            navigate("/admin/reports")
          }
        >
          View Reports
        </button>
      </div>

    </div>
  </main>
</div>

);
}