import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Registerdriver.css";

function RegisterDriver() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [licenseNumber, setLicenseNumber] =
    useState("");
  const [vehicleNumber, setVehicleNumber] =
    useState("");
  const [vehicleType, setVehicleType] =
    useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/drivers/register`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone,
            password,
            licenseNumber,
            vehicleNumber,
            vehicleType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to register driver."
        );
      }

      setSuccess(
        "Driver registered successfully!"
      );

      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setLicenseNumber("");
      setVehicleNumber("");
      setVehicleType("");

      setTimeout(() => {
        navigate("/admin/drivers");
      }, 1200);
    } catch (err) {
      console.error(
        "Driver registration error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to register driver."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-driver-page">
      <div className="register-driver-container">

        <div className="register-driver-header">
          <div>
            <h1>Register Driver</h1>

            <p>
              Create a new delivery driver account
            </p>
          </div>

          <button
            type="button"
            className="back-drivers-button"
            onClick={() =>
              navigate("/admin/drivers")
            }
          >
            ← Back to Drivers
          </button>
        </div>

        {error && (
          <div className="driver-error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="driver-success">
            ✅ {success}
          </div>
        )}

        <form
          className="register-driver-form"
          onSubmit={handleSubmit}
        >

          {/* PERSONAL INFORMATION */}

          <div className="form-section">
            <h2>Personal Information</h2>

            <div className="form-grid">

              <div className="form-group">
                <label htmlFor="name">
                  Full Name
                </label>

                <input
                  id="name"
                  type="text"
                  placeholder="Enter driver's full name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  Email Address
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="driver@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  Phone Number
                </label>

                <input
                  id="phone"
                  type="tel"
                  placeholder="07XXXXXXXX"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength={8}
                  required
                />
              </div>

            </div>
          </div>

          {/* DRIVER INFORMATION */}

          <div className="form-section">
            <h2>Driver Information</h2>

            <div className="form-grid">

              <div className="form-group">
                <label htmlFor="licenseNumber">
                  License Number
                </label>

                <input
                  id="licenseNumber"
                  type="text"
                  placeholder="Enter driver's license number"
                  value={licenseNumber}
                  onChange={(event) =>
                    setLicenseNumber(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="vehicleNumber">
                  Vehicle Registration Number
                </label>

                <input
                  id="vehicleNumber"
                  type="text"
                  placeholder="e.g. KDA 123A"
                  value={vehicleNumber}
                  onChange={(event) =>
                    setVehicleNumber(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="vehicleType">
                  Vehicle Type
                </label>

                <select
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(event) =>
                    setVehicleType(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select vehicle type
                  </option>

                  <option value="Motorcycle">
                    Motorcycle
                  </option>

                  <option value="Car">
                    Car
                  </option>

                  <option value="Van">
                    Van
                  </option>

                  <option value="Pickup">
                    Pickup
                  </option>

                  <option value="Truck">
                    Truck
                  </option>
                </select>
              </div>

            </div>
          </div>

          {/* BUTTONS */}

          <div className="form-actions">

            <button
              type="button"
              className="cancel-driver-button"
              onClick={() =>
                navigate("/admin/drivers")
              }
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="register-driver-button"
              disabled={loading}
            >
              {loading
                ? "Registering..."
                : "Register Driver"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

export default RegisterDriver;