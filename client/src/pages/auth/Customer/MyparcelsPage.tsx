import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyparcelsPage.css";

interface Parcel {
  id: number;
  trackingNumber: string;
  receiverName: string;
  deliveryType: string;
  status: string;
  price: number;
}

export default function MyParcels() {
  const navigate = useNavigate();

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const loadParcels = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://localhost:5000/api/parcels/my",
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
          if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
            return;
          }

          throw new Error(
            data.message || "Unable to load parcels."
          );
        }

        setParcels(data.parcels || []);
      } catch (error) {
        console.error("Load parcels error:", error);

        setError(
          "Unable to load your parcels. Please make sure the server is running."
        );
      } finally {
        setLoading(false);
      }
    };

    loadParcels();
  }, [navigate]);

  return (
    <div className="page-container">
      <h1>My Parcels</h1>

      {loading && (
        <p>Loading your parcels...</p>
      )}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && parcels.length === 0 && (
        <p>
          You have not created any parcels yet.
        </p>
      )}

      {!loading && parcels.length > 0 && (
        <div className="parcel-table">
          <table>
            <thead>
              <tr>
                <th>Tracking Number</th>
                <th>Receiver</th>
                <th>Delivery Type</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>

            <tbody>
              {parcels.map((parcel) => (
                <tr key={parcel.id}>
                  <td>
                    {parcel.trackingNumber}
                  </td>

                  <td>
                    {parcel.receiverName}
                  </td>

                  <td>
                    {parcel.deliveryType ===
                    "EXPRESS"
                      ? "Express"
                      : "Standard"}
                  </td>

                  <td>
                    {parcel.status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (letter) =>
                        letter.toUpperCase()
                      )}
                  </td>

                  <td>
                    KES{" "}
                    {Number(
                      parcel.price
                    ).toLocaleString()}
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