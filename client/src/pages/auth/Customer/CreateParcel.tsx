import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateParcel.css";

function CreateParcel() {
  const navigate = useNavigate();

  const [receiverName, setReceiverName] =
    useState("");

  const [receiverPhone, setReceiverPhone] =
    useState("");

  const [pickupAddress, setPickupAddress] =
    useState("");

  const [deliveryAddress, setDeliveryAddress] =
    useState("");

  const [parcelType, setParcelType] =
    useState("Documents");

  const [weight, setWeight] =
    useState("");

  const [deliveryType, setDeliveryType] =
    useState("STANDARD");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [trackingNumber, setTrackingNumber] =
    useState("");

  const calculatePrice = () => {
    const parcelWeight = Number(weight);

    if (
      !weight ||
      Number.isNaN(parcelWeight) ||
      parcelWeight <= 0
    ) {
      return 0;
    }

    let price = 200;

    if (parcelWeight > 1) {
      price += (parcelWeight - 1) * 50;
    }

    if (deliveryType === "EXPRESS") {
      price *= 1.5;
    }

    return Math.round(price * 100) / 100;
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const token =
      localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    if (
      !receiverName.trim() ||
      !receiverPhone.trim() ||
      !pickupAddress.trim() ||
      !deliveryAddress.trim() ||
      !weight
    ) {
      setError(
        "Please complete all required fields."
      );
      return;
    }

    if (Number(weight) <= 0) {
      setError(
        "Weight must be greater than 0."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/parcels`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiverName:
              receiverName.trim(),

            receiverPhone:
              receiverPhone.trim(),

            pickupAddress:
              pickupAddress.trim(),

            deliveryAddress:
              deliveryAddress.trim(),

            parcelType:
              parcelType.trim(),

            weight: Number(weight),

            deliveryType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          navigate("/login");
          return;
        }

        throw new Error(
          data.message ||
            "Unable to create parcel."
        );
      }

      setTrackingNumber(
        data.parcel.trackingNumber
      );

      setSuccess(
        "Your parcel has been created successfully!"
      );

      // Clear form
      setReceiverName("");
      setReceiverPhone("");
      setPickupAddress("");
      setDeliveryAddress("");
      setParcelType("Documents");
      setWeight("");
      setDeliveryType("STANDARD");
    } catch (error) {
      console.error(error);

      if (error instanceof TypeError) {
        setError(
          "Cannot connect to the server. Please make sure the backend is running."
        );
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(
          "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-parcel-page">

      {/* SIDEBAR */}

      <aside className="create-sidebar">
        <div className="create-logo">
          <div className="create-logo-icon">
            📦
          </div>

          <div>
            <h2>ParcelFlow</h2>
            <span>
              Management System
            </span>
          </div>
        </div>

        <nav className="create-nav">

          <button
            onClick={() =>
              navigate(
                "/customer/dashboard"
              )
            }
          >
            🏠
            <span>Dashboard</span>
          </button>

          <button className="active">
            ➕
            <span>Create Parcel</span>
          </button>

          <button
            onClick={() =>
              navigate(
                "/customer/my-parcels"
              )
            }
          >
            📦
            <span>My Parcels</span>
          </button>

          <button
            onClick={() =>
              navigate(
                "/customer/track-parcel"
              )
            }
          >
            🔍
            <span>Track Parcel</span>
          </button>

        </nav>

        <button
          className="create-logout"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        >
          🚪
          <span>Logout</span>
        </button>
      </aside>

      {/* MAIN */}

      <main className="create-main">

        <div className="create-header">
          <div>
            <button
              className="back-button"
              onClick={() =>
                navigate(
                  "/customer/dashboard"
                )
              }
            >
              ← Back to Dashboard
            </button>

            <h1>Create New Parcel</h1>

            <p>
              Enter your parcel details below
              to arrange a delivery.
            </p>
          </div>
        </div>

        {error && (
          <div className="parcel-alert error">
            ⚠️
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="parcel-alert success">
            <div>
              <strong>
                ✓ Parcel Created Successfully
              </strong>

              <p>{success}</p>

              <div className="tracking-result">
                <span>
                  Tracking Number
                </span>

                <strong>
                  {trackingNumber}
                </strong>
              </div>

              <button
                onClick={() =>
                  navigate(
                    "/customer/track-parcel"
                  )
                }
              >
                Track This Parcel →
              </button>
            </div>
          </div>
        )}

        <div className="create-layout">

          {/* FORM */}

          <section className="parcel-form-card">

            <div className="form-section-title">
              <span>👤</span>

              <div>
                <h2>Receiver Information</h2>
                <p>
                  Who should receive this
                  parcel?
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-row">

                <div className="form-field">
                  <label>
                    Receiver Name *
                  </label>

                  <input
                    type="text"
                    placeholder="Enter receiver's full name"
                    value={receiverName}
                    onChange={(e) =>
                      setReceiverName(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>
                    Receiver Phone *
                  </label>

                  <input
                    type="tel"
                    placeholder="07XXXXXXXX"
                    value={receiverPhone}
                    onChange={(e) =>
                      setReceiverPhone(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-section-title location-title">
                <span>📍</span>

                <div>
                  <h2>Delivery Addresses</h2>
                  <p>
                    Where should the parcel
                    be collected and delivered?
                  </p>
                </div>
              </div>

              <div className="form-field">
                <label>
                  Pickup Address *
                </label>

                <input
                  type="text"
                  placeholder="Enter pickup location"
                  value={pickupAddress}
                  onChange={(e) =>
                    setPickupAddress(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label>
                  Delivery Address *
                </label>

                <input
                  type="text"
                  placeholder="Enter delivery location"
                  value={deliveryAddress}
                  onChange={(e) =>
                    setDeliveryAddress(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-section-title">
                <span>📦</span>

                <div>
                  <h2>Parcel Details</h2>
                  <p>
                    Tell us about your parcel.
                  </p>
                </div>
              </div>

              <div className="form-row">

                <div className="form-field">
                  <label>
                    Parcel Type *
                  </label>

                  <select
                    value={parcelType}
                    onChange={(e) =>
                      setParcelType(
                        e.target.value
                      )
                    }
                  >
                    <option>
                      Documents
                    </option>

                    <option>
                      Electronics
                    </option>

                    <option>
                      Clothing
                    </option>

                    <option>
                      Food
                    </option>

                    <option>
                      Fragile Items
                    </option>

                    <option>
                      Other
                    </option>
                  </select>
                </div>

                <div className="form-field">
                  <label>
                    Weight (kg) *
                  </label>

                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="e.g. 2.5"
                    value={weight}
                    onChange={(e) =>
                      setWeight(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-section-title">
                <span>🚚</span>

                <div>
                  <h2>Delivery Type</h2>
                  <p>
                    Select your preferred
                    delivery speed.
                  </p>
                </div>
              </div>

              <div className="delivery-options">

                <label
                  className={
                    deliveryType ===
                    "STANDARD"
                      ? "delivery-option selected"
                      : "delivery-option"
                  }
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    value="STANDARD"
                    checked={
                      deliveryType ===
                      "STANDARD"
                    }
                    onChange={(e) =>
                      setDeliveryType(
                        e.target.value
                      )
                    }
                  />

                  <div>
                    <strong>
                      Standard Delivery
                    </strong>

                    <span>
                      Reliable and affordable
                    </span>
                  </div>

                  <b>1×</b>
                </label>

                <label
                  className={
                    deliveryType ===
                    "EXPRESS"
                      ? "delivery-option selected"
                      : "delivery-option"
                  }
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    value="EXPRESS"
                    checked={
                      deliveryType ===
                      "EXPRESS"
                    }
                    onChange={(e) =>
                      setDeliveryType(
                        e.target.value
                      )
                    }
                  />

                  <div>
                    <strong>
                      Express Delivery
                    </strong>

                    <span>
                      Faster priority delivery
                    </span>
                  </div>

                  <b>1.5×</b>
                </label>

              </div>

              <button
                type="submit"
                className="create-parcel-button"
                disabled={loading}
              >
                {loading
                  ? "Creating Parcel..."
                  : "Create Parcel →"}
              </button>

            </form>
          </section>

          {/* PRICE SUMMARY */}

          <aside className="price-card">

            <div className="price-header">
              <span>💰</span>

              <div>
                <h2>Price Estimate</h2>

                <p>
                  Estimated delivery cost
                </p>
              </div>
            </div>

            <div className="price-amount">
              <span>KES</span>

              <strong>
                {calculatePrice().toLocaleString(
                  "en-KE",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            <div className="price-breakdown">

              <div>
                <span>
                  Base delivery
                </span>

                <span>
                  KES 200.00
                </span>
              </div>

              <div>
                <span>
                  Weight charge
                </span>

                <span>
                  KES{" "}
                  {weight &&
                  Number(weight) > 1
                    ? (
                        (Number(weight) -
                          1) *
                        50
                      ).toFixed(2)
                    : "0.00"}
                </span>
              </div>

              <div>
                <span>
                  Delivery type
                </span>

                <span>
                  {deliveryType ===
                  "EXPRESS"
                    ? "Express"
                    : "Standard"}
                </span>
              </div>

            </div>

            <div className="price-info">
              <span>ℹ️</span>

              <p>
                Final delivery charges may
                depend on the actual delivery
                distance and parcel details.
              </p>
            </div>

          </aside>

        </div>
      </main>
    </div>
  );
}

export default CreateParcel;