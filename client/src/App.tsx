import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/auth/login";
import Register from "./pages/auth/register";

import CustomerDashboard from "./pages/auth/Customer/customerDashboard";
import CreateParcel from "./pages/auth/Customer/CreateParcel";
import MyParcelsPage from "./pages/auth/Customer/MyparcelsPage";
import TrackParcel from "./pages/auth/Customer/TrackParcel";
import Payment from "./pages/auth/Customer/payment";

import DriverDashboard from "./pages/Driver/DriverDashboard";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminParcels from "./pages/admin/adminparcels";
import AdminCustomers from "./pages/admin/Admincustomers";
import AdminDrivers from "./pages/admin/Admindrivers";
import Admindeliveries from "./pages/admin/Admindeliveries";
import Adminreports from "./pages/admin/Adminreports";
import RegisterDriver from "./pages/admin/Registerdriver";

import Adminroute from "./components/Adminroute";

import "./App.css";

function RoleRoute({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (!token || !savedUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(savedUser);

    if (user.role === role) {
      return children;
    }

    if (
      user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "SUPPORT"
    ) {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user.role === "DRIVER") {
      return <Navigate to="/driver/dashboard" replace />;
    }

    return <Navigate to="/customer/dashboard" replace />;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return <Navigate to="/login" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* HOME */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* AUTHENTICATION */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* CUSTOMER ROUTES */}
        <Route
          path="/customer/dashboard"
          element={
            <RoleRoute role="CUSTOMER">
              <CustomerDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/customer/create-parcel"
          element={
            <RoleRoute role="CUSTOMER">
              <CreateParcel />
            </RoleRoute>
          }
        />

        <Route
          path="/customer/my-parcels"
          element={
            <RoleRoute role="CUSTOMER">
              <MyParcelsPage />
            </RoleRoute>
          }
        />

        <Route
          path="/customer/track-parcel"
          element={
            <RoleRoute role="CUSTOMER">
              <TrackParcel />
            </RoleRoute>
          }
        />

        {/* PAYMENT */}
        <Route
          path="/customer/payment"
          element={
            <RoleRoute role="CUSTOMER">
              <Payment />
            </RoleRoute>
          }
        />

        {/* DRIVER ROUTES */}
        <Route
          path="/driver/dashboard"
          element={
            <RoleRoute role="DRIVER">
              <DriverDashboard />
            </RoleRoute>
          }
        />

        {/* ADMIN ROUTES */}
        <Route element={<Adminroute />}>

          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/parcels"
            element={<AdminParcels />}
          />

          <Route
            path="/admin/customers"
            element={<AdminCustomers />}
          />

          <Route
            path="/admin/drivers"
            element={<AdminDrivers />}
          />

          <Route
            path="/admin/reports"
            element={<Adminreports />}
          />

          <Route
            path="/admin/register-driver"
            element={<RegisterDriver />}
          />

        </Route>

        {/* DELIVERY MANAGEMENT */}
        <Route
          path="/admin/deliveries"
          element={<Admindeliveries />}
        />

        {/* UNKNOWN ROUTES */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;