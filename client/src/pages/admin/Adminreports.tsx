import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import "./AdminReports.css";

interface ReportSummary {
  totalCustomers: number;
  totalDrivers: number;
  totalParcels: number;
  deliveredParcels: number;
  pendingParcels: number;
  inTransitParcels: number;
  cancelledParcels: number;
  totalRevenue: number;
}

interface RecentParcel {
  id: number;
  trackingNumber: string;
  receiverName: string;
  price: number;
  status: string;
  createdAt: string;
}

function AdminReports() {
  const navigate = useNavigate();

  const [summary, setSummary] =
    useState<ReportSummary | null>(null);

  const [recentParcels, setRecentParcels] =
    useState<RecentParcel[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const loadReports = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/admin/reports",
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
            data.message || "Unable to load system reports."
          );
        }

        setSummary(data.summary || null);
        setRecentParcels(data.recentParcels || []);
      } catch (err) {
        console.error("Reports error:", err);

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unable to load system reports.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [navigate]);

  const generatePDF = () => {
    if (!summary) {
      return;
    }

    const doc = new jsPDF();

    // A4 page width in millimetres
    const pageWidth = 210;

    // =========================
    // PDF HEADER
    // =========================

    doc.setFontSize(20);
    doc.text("Parcel Management System", 20, 20);

    doc.setFontSize(15);
    doc.text("Administrative System Report", 20, 32);

    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      20,
      42
    );

    doc.line(20, 47, pageWidth - 20, 47);

    // =========================
    // SYSTEM SUMMARY
    // =========================

    doc.setFontSize(15);
    doc.text("System Summary", 20, 60);

    doc.setFontSize(11);

    let y = 72;

    doc.text(
      `Total Customers: ${summary.totalCustomers}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `Total Drivers: ${summary.totalDrivers}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `Total Parcels: ${summary.totalParcels}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `Total Revenue: KES ${Number(
        summary.totalRevenue
      ).toFixed(2)}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `Pending Parcels: ${summary.pendingParcels}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `In Transit Parcels: ${summary.inTransitParcels}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `Delivered Parcels: ${summary.deliveredParcels}`,
      25,
      y
    );

    y += 9;

    doc.text(
      `Cancelled Parcels: ${summary.cancelledParcels}`,
      25,
      y
    );

    // =========================
    // RECENT PARCELS
    // =========================

    y += 20;

    doc.setFontSize(15);
    doc.text("Recent Parcels", 20, y);

    y += 12;

    doc.setFontSize(9);

    // Table headings
    doc.text("Tracking Number", 20, y);
    doc.text("Receiver", 65, y);
    doc.text("Price", 110, y);
    doc.text("Status", 140, y);
    doc.text("Date", 175, y);

    y += 3;

    doc.line(20, y, pageWidth - 20, y);

    y += 8;

    // =========================
    // PARCEL DATA
    // =========================

    if (recentParcels.length === 0) {
      doc.setFontSize(10);

      doc.text(
        "No recent parcels available.",
        20,
        y
      );
    } else {
      recentParcels.forEach((parcel) => {
        // Add a new page when the current
        // page becomes full.
        if (y > 270) {
          doc.addPage();

          y = 20;

          doc.setFontSize(11);

          doc.text(
            "Recent Parcels - Continued",
            20,
            y
          );

          y += 15;
        }

        doc.setFontSize(8);

        doc.text(
          parcel.trackingNumber.substring(0, 20),
          20,
          y
        );

        doc.text(
          parcel.receiverName.substring(0, 20),
          65,
          y
        );

        doc.text(
          `KES ${Number(parcel.price).toFixed(2)}`,
          110,
          y
        );

        doc.text(
          parcel.status
            .replace(/_/g, " ")
            .substring(0, 18),
          140,
          y
        );

        doc.text(
          new Date(
            parcel.createdAt
          ).toLocaleDateString(),
          175,
          y
        );

        y += 9;
      });
    }

    // =========================
    // FOOTER
    // =========================

    doc.setFontSize(8);

    doc.text(
      "Parcel Management System",
      20,
      290
    );

    // =========================
    // SAVE PDF
    // =========================

    const date = new Date()
      .toISOString()
      .split("T")[0];

    doc.save(
      `parcel-management-report-${date}.pdf`
    );
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="admin-reports-page">
        <div className="admin-reports-message">
          <h2>Loading System Reports...</h2>

          <p>
            Please wait while the report data is loading.
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
      <div className="admin-reports-page">
        <div className="admin-reports-header">
          <div>
            <h1>System Reports</h1>

            <p>
              Overview of Parcel Management System activity
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="admin-reports-error">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  // =========================
  // MAIN PAGE
  // =========================

  return (
    <div className="admin-reports-page">

      {/* HEADER */}
      <div className="admin-reports-header">
        <div>
          <h1>System Reports</h1>

          <p>
            Overview of Parcel Management System activity
          </p>
        </div>

        <div className="admin-report-actions">

          <button
            type="button"
            className="generate-pdf-button"
            onClick={generatePDF}
            disabled={!summary}
          >
            📄 Generate PDF Report
          </button>

          <button
            type="button"
            className="back-dashboard-button"
            onClick={() => navigate("/admin/dashboard")}
          >
            ← Back to Dashboard
          </button>

        </div>
      </div>

      {/* SUMMARY CARDS */}
      {summary && (
        <>
          <div className="reports-grid">

            <div className="report-card">
              <div className="report-icon">
                👥
              </div>

              <div>
                <p>Total Customers</p>

                <h2>
                  {summary.totalCustomers}
                </h2>
              </div>
            </div>

            <div className="report-card">
              <div className="report-icon">
                🚚
              </div>

              <div>
                <p>Total Drivers</p>

                <h2>
                  {summary.totalDrivers}
                </h2>
              </div>
            </div>

            <div className="report-card">
              <div className="report-icon">
                📦
              </div>

              <div>
                <p>Total Parcels</p>

                <h2>
                  {summary.totalParcels}
                </h2>
              </div>
            </div>

            <div className="report-card">
              <div className="report-icon">
                💰
              </div>

              <div>
                <p>Total Revenue</p>

                <h2>
                  KES{" "}
                  {Number(
                    summary.totalRevenue
                  ).toFixed(2)}
                </h2>
              </div>
            </div>

          </div>

          {/* STATUS SECTION */}
          <div className="status-section">

            <h2>Parcel Status Overview</h2>

            <div className="status-grid">

              <div className="status-card pending">
                <span>Pending</span>

                <strong>
                  {summary.pendingParcels}
                </strong>
              </div>

              <div className="status-card transit">
                <span>In Transit</span>

                <strong>
                  {summary.inTransitParcels}
                </strong>
              </div>

              <div className="status-card delivered">
                <span>Delivered</span>

                <strong>
                  {summary.deliveredParcels}
                </strong>
              </div>

              <div className="status-card cancelled">
                <span>Cancelled</span>

                <strong>
                  {summary.cancelledParcels}
                </strong>
              </div>

            </div>
          </div>

          {/* RECENT PARCELS */}
          <div className="recent-section">

            <h2>Recent Parcels</h2>

            {recentParcels.length === 0 ? (
              <div className="admin-reports-message">

                <h3>No parcels found</h3>

                <p>
                  There are currently no parcels in the
                  system.
                </p>

              </div>
            ) : (
              <div className="reports-table-wrapper">

                <table className="reports-table">

                  <thead>
                    <tr>
                      <th>Tracking Number</th>
                      <th>Receiver</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentParcels.map((parcel) => (
                      <tr key={parcel.id}>

                        <td>
                          <strong>
                            {parcel.trackingNumber}
                          </strong>
                        </td>

                        <td>
                          {parcel.receiverName}
                        </td>

                        <td>
                          KES{" "}
                          {Number(
                            parcel.price
                          ).toFixed(2)}
                        </td>

                        <td>
                          <span
                            className={`report-status ${parcel.status.toLowerCase()}`}
                          >
                            {parcel.status.replace(
                              /_/g,
                              " "
                            )}
                          </span>
                        </td>

                        <td>
                          {new Date(
                            parcel.createdAt
                          ).toLocaleDateString()}
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>

              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

export default AdminReports;