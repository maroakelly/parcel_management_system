import { Navigate, Outlet } from "react-router-dom";

export default function Adminroute() {
  const token = localStorage.getItem("token");
  const userString = localStorage.getItem("user");

  if (!token || !userString) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userString);

    if (
      user.role !== "ADMIN" &&
      user.role !== "SUPER_ADMIN" &&
      user.role !== "SUPPORT"
    ) {
      return <Navigate to="/customer/dashboard" replace />;
    }

    return <Outlet />;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/login" replace />;
  }
}