import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./payment.css";

interface Parcel {
  id: number;
  trackingNumber: string;
  price: number;
  status: string;
}

interface PaymentRecord {
  id: number;
  parcelId: number;
  amount: number;
  method: string;
  status: string;
  phoneNumber?: string | null;
  transactionId?: string | null;
  createdAt: string;
  parcel?: Parcel;
}

const API_URL = `${import.meta.env.VITE_API_URL}/api`;;

export default function Payment() {
  const navigate = useNavigate();

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState("CASH_ON_DELIVERY");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
   * Safely read the backend response.
   *
   * This prevents:
   * Unexpected token '<'
   *
   * from crashing the frontend when the server
   * returns an HTML page instead of JSON.
   */
  const readResponse = async (response: Response) => {
    const contentType =
      response.headers.get("content-type") || "";

    const text = await response.text();

    if (!text) {
      return {};
    }

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(
          "The server returned invalid JSON."
        );
      }
    }

    if (text.trim().startsWith("<")) {
      throw new Error(
        `Backend returned an HTML response instead of JSON. Check that your backend is running on ${API_URL}.`
      );
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  };

  const getToken = () => {
    return localStorage.getItem("token");
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      /*
       * Load customer parcels
       */
      const parcelsResponse = await fetch(
        `${API_URL}/customer/parcels`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const parcelsData =
        await readResponse(parcelsResponse);

      if (
        parcelsResponse.status === 401 ||
        parcelsResponse.status === 403
      ) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!parcelsResponse.ok) {
        throw new Error(
          parcelsData.message ||
            "Unable to load your parcels."
        );
      }

      setParcels(
        Array.isArray(parcelsData.parcels)
          ? parcelsData.parcels
          : []
      );

      /*
       * Load payment history
       */
      const paymentsResponse = await fetch(
        `${API_URL}/payments/history`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const paymentsData =
        await readResponse(paymentsResponse);

      if (
        paymentsResponse.status === 401 ||
        paymentsResponse.status === 403
      ) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!paymentsResponse.ok) {
        throw new Error(
          paymentsData.message ||
            "Unable to load payment history."
        );
      }

      setPayments(
        Array.isArray(paymentsData.payments)
          ? paymentsData.payments
          : []
      );
    } catch (err) {
      console.error("Payment page error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load payment information."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setMessage("");
    setError("");

    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    if (!selectedParcel) {
      setError("Please select a parcel.");
      return;
    }

    if (
      paymentMethod === "MPESA" &&
      !phoneNumber.trim()
    ) {
      setError(
        "Please enter your M-Pesa phone number."
      );
      return;
    }

    /*
     * Basic Kenyan phone number validation.
     *
     * Accepts:
     * 0712345678
     * 0112345678
     * 254712345678
     * +254712345678
     */
    if (paymentMethod === "MPESA") {
      const cleanedPhone =
        phoneNumber.replace(/\s+/g, "");

      const validPhone =
        /^(?:07|01)\d{8}$/.test(
          cleanedPhone
        ) ||
        /^254(?:7|1)\d{8}$/.test(
          cleanedPhone
        ) ||
        /^\+254(?:7|1)\d{8}$/.test(
          cleanedPhone
        );

      if (!validPhone) {
        setError(
          "Please enter a valid Kenyan M-Pesa phone number."
        );
        return;
      }
    }

    const endpoint =
      paymentMethod === "MPESA"
        ? `${API_URL}/payments/online`
        : `${API_URL}/payments/cash`;

    try {
      setProcessing(true);

      const body =
        paymentMethod === "MPESA"
          ? {
              parcelId: Number(selectedParcel),
              phoneNumber:
                phoneNumber.trim(),
            }
          : {
              parcelId: Number(selectedParcel),
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await readResponse(response);

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Payment could not be processed."
        );
      }

      if (paymentMethod === "MPESA") {
        setMessage(
          data.message ||
            "M-Pesa payment request created successfully. Please check your phone and complete the payment."
        );
      } else {
        setMessage(
          data.message ||
            "Cash on Delivery has been selected successfully."
        );
      }

      setSelectedParcel("");
      setPhoneNumber("");

      await loadData();
    } catch (err) {
      console.error(
        "Payment processing error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Payment could not be processed."
      );
    } finally {
      setProcessing(false);
    }
  };

  const selectedParcelData = parcels.find(
    (parcel) =>
      parcel.id === Number(selectedParcel)
  );

  const formatStatus = (status: string) => {
    return status
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  return (
    <div className="payment-page">

      <header className="payment-header">
        <div>
          <h1>Payment</h1>
          <p>
            Manage your parcel payments
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate("/customer/dashboard")
          }
        >
          ← Dashboard
        </button>
      </header>

      <main className="payment-content">

        {error && (
          <div className="payment-error">
            {error}
          </div>
        )}

        {message && (
          <div className="payment-success">
            {message}
          </div>
        )}

        <section className="payment-card">
          <h2>Make a Payment</h2>

          {loading ? (
            <div className="payment-loading">
              <p>
                Loading your parcels...
              </p>
            </div>
          ) : parcels.length === 0 ? (
            <div className="no-parcels">
              <h3>No unpaid parcels available</h3>

              <p>
                You currently have no parcels
                available for payment.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/customer/create-parcel"
                  )
                }
              >
                Create Parcel
              </button>
            </div>
          ) : (
            <>
              <div className="payment-field">
                <label htmlFor="parcel">
                  Select Parcel
                </label>

                <select
                  id="parcel"
                  value={selectedParcel}
                  onChange={(e) =>
                    setSelectedParcel(
                      e.target.value
                    )
                  }
                  disabled={processing}
                >
                  <option value="">
                    Select a parcel
                  </option>

                  {parcels.map((parcel) => (
                    <option
                      key={parcel.id}
                      value={parcel.id}
                    >
                      {parcel.trackingNumber} —
                      {" "}KES{" "}
                      {Number(
                        parcel.price
                      ).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {selectedParcelData && (
                <div className="payment-amount">
                  <span>
                    Amount to Pay
                  </span>

                  <strong>
                    KES{" "}
                    {Number(
                      selectedParcelData.price
                    ).toLocaleString()}
                  </strong>
                </div>
              )}

              <div className="payment-field">
                <label>
                  Payment Method
                </label>

                <div className="payment-methods">

                  <button
                    type="button"
                    className={
                      paymentMethod ===
                      "CASH_ON_DELIVERY"
                        ? "payment-method active"
                        : "payment-method"
                    }
                    onClick={() =>
                      setPaymentMethod(
                        "CASH_ON_DELIVERY"
                      )
                    }
                    disabled={processing}
                  >
                    <span>💵</span>

                    <strong>
                      Cash on Delivery
                    </strong>

                    <small>
                      Pay when your parcel
                      arrives
                    </small>
                  </button>

                  <button
                    type="button"
                    className={
                      paymentMethod ===
                      "MPESA"
                        ? "payment-method active"
                        : "payment-method"
                    }
                    onClick={() =>
                      setPaymentMethod("MPESA")
                    }
                    disabled={processing}
                  >
                    <span>📱</span>

                    <strong>
                      M-Pesa
                    </strong>

                    <small>
                      Pay using your phone
                    </small>
                  </button>

                </div>
              </div>

              {paymentMethod ===
                "MPESA" && (
                <div className="payment-field">
                  <label htmlFor="phone">
                    M-Pesa Phone Number
                  </label>

                  <input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(
                        e.target.value
                      )
                    }
                    disabled={processing}
                  />

                  <small>
                    Enter the number registered
                    for M-Pesa.
                  </small>
                </div>
              )}

              <button
                type="button"
                className="pay-button"
                onClick={handlePayment}
                disabled={
                  processing ||
                  !selectedParcel
                }
              >
                {processing
                  ? "Processing..."
                  : paymentMethod ===
                    "MPESA"
                  ? "Pay with M-Pesa"
                  : "Confirm Cash on Delivery"}
              </button>
            </>
          )}
        </section>

        <section className="payment-history-card">
          <h2>Payment History</h2>

          {loading ? (
            <p className="empty-payment">
              Loading payment history...
            </p>
          ) : payments.length === 0 ? (
            <p className="empty-payment">
              No payments recorded yet.
            </p>
          ) : (
            <div className="payment-history-list">
              {payments.map((payment) => (
                <div
                  className="payment-history-item"
                  key={payment.id}
                >
                  <div>
                    <strong>
                      {payment.parcel
                        ?.trackingNumber ||
                        `Parcel #${payment.parcelId}`}
                    </strong>

                    <span>
                      {formatStatus(
                        payment.method
                      )}
                    </span>

                    {payment.createdAt && (
                      <small>
                        {formatDate(
                          payment.createdAt
                        )}
                      </small>
                    )}
                  </div>

                  <div>
                    <strong>
                      KES{" "}
                      {Number(
                        payment.amount
                      ).toLocaleString()}
                    </strong>

                    <span
                      className={`payment-status ${payment.status.toLowerCase()}`}
                    >
                      {formatStatus(
                        payment.status
                      )}
                    </span>

                    {payment.transactionId && (
                      <small>
                        Transaction:{" "}
                        {
                          payment.transactionId
                        }
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}