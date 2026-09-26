import { useState } from "react";
import "./TrackParcel.css";

interface StatusHistory {
  id: number;
  status: string;
  notes: string | null;
  createdAt: string;
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
  statusHistory: StatusHistory[];
}

export default function TrackParcel() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login first.");
      return;
    }

    if (!trackingNumber.trim()) {
      setError("Please enter a tracking number.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setParcel(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/parcels/track/${encodeURIComponent(
          trackingNumber.trim()
        )}`,
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
          data.message || "Parcel not found."
        );
      }

      setParcel(data.parcel);
    } catch (error) {
      console.error("Track parcel error:", error);

      if (error instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please make sure the backend is running."
        );
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to track parcel.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <div className="page-container">
      <h1>Track Your Parcel</h1>

      <p>
        Enter your tracking number to see the current parcel status.
      </p>

      <form onSubmit={handleTrack}>
        <input
          type="text"
          placeholder="e.g. PKG-12345678-1234"
          value={trackingNumber}
          onChange={(e) =>
            setTrackingNumber(e.target.value)
          }
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Tracking..." : "Track Parcel"}
        </button>
      </form>

      {error && (
        <p className="tracking-error">
          ⚠️ {error}
        </p>
      )}

      {parcel && (
        <div className="parcel-details-card">
          <h2>Parcel Details</h2>

          <div className="parcel-info">
            <p>
              <strong>Tracking Number</strong>
              {parcel.trackingNumber}
            </p>

            <p>
              <strong>Receiver</strong>
              {parcel.receiverName}
            </p>

            <p>
              <strong>Pickup Address</strong>
              {parcel.pickupAddress}
            </p>

            <p>
              <strong>Delivery Address</strong>
              {parcel.deliveryAddress}
            </p>

            <p>
              <strong>Parcel Type</strong>
              {parcel.parcelType}
            </p>

            <p>
              <strong>Weight</strong>
              {parcel.weight} kg
            </p>

            <p>
              <strong>Delivery Type</strong>
              {formatStatus(parcel.deliveryType)}
            </p>

            <p>
              <strong>Price</strong>
              KES{" "}
              {Number(parcel.price).toLocaleString()}
            </p>
          </div>

          <div className="current-status">
            <h3>Current Status</h3>

            <span>
              {formatStatus(parcel.status)}
            </span>
          </div>

          <div className="tracking-history">
            <h2>Tracking History</h2>

            {parcel.statusHistory.length === 0 ? (
              <p>No tracking history available.</p>
            ) : (
              parcel.statusHistory.map((history) => (
                <div
                  className="tracking-item"
                  key={history.id}
                >
                  <strong>
                    {formatStatus(history.status)}
                  </strong>

                  <p>
                    {new Date(
                      history.createdAt
                    ).toLocaleString()}
                  </p>

                  {history.notes && (
                    <p>{history.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}