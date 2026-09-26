export default function DriverDashboard() {
  return (
    <div className="page-container">
      <h1>Driver Dashboard</h1>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Assigned</h3>
          <p>0</p>
        </div>

        <div className="dashboard-card">
          <h3>In Transit</h3>
          <p>0</p>
        </div>

        <div className="dashboard-card">
          <h3>Delivered</h3>
          <p>0</p>
        </div>
      </div>
    </div>
  );
}