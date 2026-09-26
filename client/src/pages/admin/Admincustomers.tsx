import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminCustomers.css";

interface Customer {
id: number;
name: string;
email: string;
phone?: string;
status: string;
createdAt: string;
}

function Admincustomer() {
const navigate = useNavigate();

const [customers, setCustomers] = useState<Customer[]>([]);
const [searchTerm, setSearchTerm] = useState("");
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [error, setError] = useState("");

// =========================
// LOAD CUSTOMERS
// =========================

const loadCustomers = async (showRefresh = false) => {
const token = localStorage.getItem("token");

if (!token) {
  navigate("/login");
  return;
}

try {
  if (showRefresh) {
    setRefreshing(true);
  } else {
    setLoading(true);
  }

  setError("");

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/admin/customers`,
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
      data.message || "Unable to load customer records."
    );
  }

  setCustomers(data.customers || []);
} catch (err) {
  console.error("Customers error:", err);

  if (err instanceof Error) {
    setError(err.message);
  } else {
    setError("Unable to load customer records.");
  }
} finally {
  setLoading(false);
  setRefreshing(false);
}

};

useEffect(() => {
loadCustomers();
}, []);

// =========================
// UPDATE CUSTOMER STATUS
// =========================

const updateCustomerStatus = async (
id: number,
status: "ACTIVE" | "SUSPENDED"
) => {
const token = localStorage.getItem("token");

if (!token) {
  navigate("/login");
  return;
}

try {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/admin/customers/${id}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Unable to update customer status."
    );
  }

  setCustomers((previous) =>
    previous.map((customer) =>
      customer.id === id
        ? { ...customer, status }
        : customer
    )
  );
} catch (err) {
  console.error("Status update error:", err);

  alert(
    err instanceof Error
      ? err.message
      : "Unable to update customer status."
  );
}

};

// =========================
// DELETE CUSTOMER
// =========================

const deleteCustomer = async (id: number) => {
const customer = customers.find(
(item) => item.id === id
);

const confirmed = window.confirm(
  `Delete ${customer?.name || "this customer"} permanently?\n\nThis action cannot be undone.`
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
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/admin/customers/${id}`,
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
      data.message || "Unable to delete customer."
    );
  }

  setCustomers((previous) =>
    previous.filter(
      (customer) => customer.id !== id
    )
  );
} catch (err) {
  console.error("Delete customer error:", err);

  alert(
    err instanceof Error
      ? err.message
      : "Unable to delete customer."
  );
}

};

// =========================
// FILTER CUSTOMERS
// =========================

const filteredCustomers = useMemo(() => {
const search = searchTerm.trim().toLowerCase();

if (!search) {
  return customers;
}

return customers.filter((customer) => {
  return (
    customer.name.toLowerCase().includes(search) ||
    customer.email.toLowerCase().includes(search) ||
    (customer.phone || "")
      .toLowerCase()
      .includes(search) ||
    customer.status.toLowerCase().includes(search)
  );
});

}, [customers, searchTerm]);

// =========================
// STATISTICS
// =========================

const totalCustomers = customers.length;

const activeCustomers = customers.filter(
(customer) => customer.status === "ACTIVE"
).length;

const suspendedCustomers = customers.filter(
(customer) => customer.status === "SUSPENDED"
).length;

const deletedCustomers = customers.filter(
(customer) => customer.status === "DELETED"
).length;

// =========================
// INITIALS
// =========================

const getInitials = (name: string) => {
const parts = name.trim().split(" ");

if (parts.length === 1) {
  return parts[0].substring(0, 2).toUpperCase();
}

return (
  parts[0].charAt(0) +
  parts[parts.length - 1].charAt(0)
).toUpperCase();

};

// =========================
// FORMAT DATE
// =========================

const formatDate = (date: string) => {
const parsedDate = new Date(date);

if (Number.isNaN(parsedDate.getTime())) {
  return "—";
}

return parsedDate.toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

};

// =========================
// LOADING
// =========================

if (loading) {
return (
<div className="admin-customers-page">
<div className="customers-loading">

      <div className="loading-spinner"></div>

      <h2>Loading Customer Management</h2>

      <p>
        Retrieving customer records from the system...
      </p>

    </div>
  </div>
);

}

// =========================
// ERROR
// =========================

if (error) {
return (
<div className="admin-customers-page">

    <header className="customers-header">

      <div className="header-title">

        <span className="header-label">
          ADMINISTRATION
        </span>

        <h1>Customer Management</h1>

        <p>
          Manage registered customers and account
          access.
        </p>

      </div>

      <button
        className="dashboard-button"
        type="button"
        onClick={() =>
          navigate("/admin/dashboard")
        }
      >
        ← Dashboard
      </button>

    </header>

    <div className="customers-error">

      <div className="error-icon">!</div>

      <div>
        <h3>Unable to load customers</h3>
        <p>{error}</p>
      </div>

      <button
        type="button"
        onClick={() => loadCustomers()}
      >
        Try Again
      </button>

    </div>

  </div>
);

}

// =========================
// MAIN PAGE
// =========================

return (
<div className="admin-customers-page">

  {/* =========================
      HEADER
  ========================= */}

  <header className="customers-header">

    <div className="header-title">

      <span className="header-label">
        ADMINISTRATION
      </span>

      <h1>Customer Management</h1>

      <p>
        Manage registered customers and account
        access.
      </p>

    </div>

    <div className="header-actions">

      <button
        className="refresh-button"
        type="button"
        onClick={() => loadCustomers(true)}
        disabled={refreshing}
      >
        <span className={refreshing ? "refreshing" : ""}>
          ↻
        </span>

        {refreshing ? "Refreshing..." : "Refresh"}
      </button>

      <button
        className="dashboard-button"
        type="button"
        onClick={() =>
          navigate("/admin/dashboard")
        }
      >
        ← Dashboard
      </button>

    </div>

  </header>

  {/* =========================
      STATISTICS
  ========================= */}

  <section className="customer-statistics">

    <div className="stat-card">

      <div className="stat-icon total-icon">
        <span>01</span>
      </div>

      <div className="stat-information">

        <span className="stat-label">
          TOTAL CUSTOMERS
        </span>

        <strong>{totalCustomers}</strong>

        <small>
          Registered accounts
        </small>

      </div>

    </div>

    <div className="stat-card">

      <div className="stat-icon active-icon">
        <span>✓</span>
      </div>

      <div className="stat-information">

        <span className="stat-label">
          ACTIVE
        </span>

        <strong>{activeCustomers}</strong>

        <small>
          Active accounts
        </small>

      </div>

    </div>

    <div className="stat-card">

      <div className="stat-icon suspended-icon">
        <span>!</span>
      </div>

      <div className="stat-information">

        <span className="stat-label">
          SUSPENDED
        </span>

        <strong>{suspendedCustomers}</strong>

        <small>
          Restricted accounts
        </small>

      </div>

    </div>

    <div className="stat-card">

      <div className="stat-icon deleted-icon">
        <span>×</span>
      </div>

      <div className="stat-information">

        <span className="stat-label">
          DELETED
        </span>

        <strong>{deletedCustomers}</strong>

        <small>
          Deleted accounts
        </small>

      </div>

    </div>

  </section>

  {/* =========================
      CUSTOMER TABLE
  ========================= */}

  <section className="customers-panel">

    <div className="panel-header">

      <div>

        <h2>Customer Records</h2>

        <p>
          {filteredCustomers.length} of{" "}
          {totalCustomers} customers displayed
        </p>

      </div>

      <div className="search-container">

        <span className="search-icon">
          ⌕
        </span>

        <input
          type="text"
          value={searchTerm}
          onChange={(event) =>
            setSearchTerm(event.target.value)
          }
          placeholder="Search customers..."
        />

        {searchTerm && (
          <button
            className="clear-search"
            type="button"
            onClick={() => setSearchTerm("")}
          >
            ×
          </button>
        )}

      </div>

    </div>

    {/* TABLE */}

    {filteredCustomers.length === 0 ? (

      <div className="empty-customers">

        <div className="empty-icon">
          ⌕
        </div>

        <h3>
          {searchTerm
            ? "No customers found"
            : "No customer records"}
        </h3>

        <p>
          {searchTerm
            ? "Try changing your search criteria."
            : "There are currently no registered customers."}
        </p>

        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
          >
            Clear Search
          </button>
        )}

      </div>

    ) : (

      <div className="table-container">

        <table className="customers-table">

          <thead>

            <tr>
              <th>CUSTOMER</th>
              <th>CONTACT</th>
              <th>PHONE</th>
              <th>STATUS</th>
              <th>REGISTERED</th>
              <th className="actions-column">
                ACTIONS
              </th>
            </tr>

          </thead>

          <tbody>

            {filteredCustomers.map((customer) => (

              <tr key={customer.id}>

                {/* CUSTOMER */}

                <td>

                  <div className="customer-profile">

                    <div className="customer-avatar">
                      {getInitials(customer.name)}
                    </div>

                    <div className="customer-details">

                      <strong>
                        {customer.name}
                      </strong>

                      <span>
                        Customer #{customer.id}
                      </span>

                    </div>

                  </div>

                </td>

                {/* EMAIL */}

                <td>

                  <div className="contact-information">

                    <strong>
                      {customer.email}
                    </strong>

                    <span>
                      Account email
                    </span>

                  </div>

                </td>

                {/* PHONE */}

                <td>

                  <span className="phone-number">
                    {customer.phone || "Not provided"}
                  </span>

                </td>

                {/* STATUS */}

                <td>

                  <span
                    className={`customer-status ${customer.status.toLowerCase()}`}
                  >

                    <span className="status-dot"></span>

                    {customer.status}

                  </span>

                </td>

                {/* DATE */}

                <td>

                  <span className="registered-date">
                    {formatDate(customer.createdAt)}
                  </span>

                </td>

                {/* ACTIONS */}

                <td>

                  <div className="customer-actions">

                    {customer.status === "ACTIVE" ? (

                      <button
                        type="button"
                        className="action-button suspend-button"
                        onClick={() =>
                          updateCustomerStatus(
                            customer.id,
                            "SUSPENDED"
                          )
                        }
                        title="Suspend customer"
                      >
                        Suspend
                      </button>

                    ) : (

                      <button
                        type="button"
                        className="action-button activate-button"
                        onClick={() =>
                          updateCustomerStatus(
                            customer.id,
                            "ACTIVE"
                          )
                        }
                        title="Activate customer"
                      >
                        Activate
                      </button>

                    )}

                    <button
                      type="button"
                      className="action-button delete-button"
                      onClick={() =>
                        deleteCustomer(customer.id)
                      }
                      title="Delete customer"
                    >
                      Delete
                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    )}

    {/* PANEL FOOTER */}

    {filteredCustomers.length > 0 && (
      <div className="panel-footer">

        <span>
          Showing{" "}
          <strong>{filteredCustomers.length}</strong>{" "}
          customer
          {filteredCustomers.length !== 1
            ? "s"
            : ""}
        </span>

        <span>
          Parcel Management System
        </span>

      </div>
    )}

  </section>

</div>

);
}

export default Admincustomer;