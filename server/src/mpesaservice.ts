import axios from "axios";

const getAccessToken = async (): Promise<string> => {
  const consumerKey = process.env.DARAJA_CONSUMER_KEY;
  const consumerSecret = process.env.DARAJA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error("Daraja consumer credentials are missing");
  }

  const credentials = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString("base64");

  const response = await axios.get(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  return response.data.access_token;
};

export const initiateSTKPush = async (
  phoneNumber: string,
  amount: number,
  accountReference: string,
  transactionDescription: string
) => {
  const shortcode = process.env.DARAJA_SHORTCODE;
  const passkey = process.env.DARAJA_PASSKEY;
  const callbackUrl = process.env.DARAJA_CALLBACK_URL;

  if (!shortcode) {
    throw new Error("DARAJA_SHORTCODE is missing");
  }

  if (!passkey) {
    throw new Error("DARAJA_PASSKEY is missing");
  }

  if (!callbackUrl) {
    throw new Error("DARAJA_CALLBACK_URL is missing");
  }

  const accessToken = await getAccessToken();

  const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`
  ).toString("base64");

  const formattedPhone = formatPhoneNumber(phoneNumber);

  const response = await axios.post(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDescription,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

const formatPhoneNumber = (phoneNumber: string): string => {
  let phone = phoneNumber.trim();

  if (phone.startsWith("+254")) {
    phone = phone.substring(1);
  }

  if (phone.startsWith("07")) {
    phone = `254${phone.substring(1)}`;
  }

  if (phone.startsWith("01")) {
    phone = `254${phone.substring(1)}`;
  }

  if (!phone.startsWith("254")) {
    throw new Error(
      "Invalid Kenyan phone number. Use 07XXXXXXXX, 01XXXXXXXX or 254XXXXXXXXX."
    );
  }

  if (phone.length !== 12) {
    throw new Error("Invalid Kenyan phone number");
  }

  return phone;
};