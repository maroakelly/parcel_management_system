const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

const AT_USERNAME = process.env.AT_USERNAME;
const AT_API_KEY = process.env.AT_API_KEY;
const AT_SENDER_ID = process.env.AT_SENDER_ID;

type ReceiverNotification = {
  name: string;
  email?: string | null;
  phone: string;
  trackingNumber: string;
  deliveryAddress: string;
};

async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new Error("Email provider is not configured.");
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email delivery failed: ${details}`);
  }
}

async function sendSms(
  phone: string,
  message: string
): Promise<void> {
  if (!AT_USERNAME || !AT_API_KEY) {
    throw new Error("SMS provider is not configured.");
  }

  const body = new URLSearchParams({
    username: AT_USERNAME,
    to: phone,
    message,
  });

  if (AT_SENDER_ID) {
    body.set("from", AT_SENDER_ID);
  }

  const response = await fetch(
    "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: {
        apiKey: AT_API_KEY,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`SMS delivery failed: ${details}`);
  }

  const result = await response.json() as {
    SMSMessageData?: {
      Recipients?: Array<{
        status?: string;
        statusCode?: number;
      }>;
    };
  };

  const recipients =
    result.SMSMessageData?.Recipients ?? [];

  if (
    recipients.length > 0 &&
    recipients.every(
      (recipient) =>
        recipient.statusCode !== 100 &&
        recipient.status !== "Success"
    )
  ) {
    throw new Error("The SMS provider did not accept the message.");
  }
}

async function sendReceiverNotification(
  receiver: ReceiverNotification,
  subject: string,
  message: string
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (receiver.email?.trim()) {
    tasks.push(
      sendEmail(
        receiver.email.trim(),
        subject,
        `
          <div style="font-family: Arial, sans-serif; line-height: 1.6">
            <h2>${subject}</h2>
            <p>Hello ${escapeHtml(receiver.name)},</p>
            <p>${escapeHtml(message)}</p>
            <p><strong>Tracking number:</strong>
              ${escapeHtml(receiver.trackingNumber)}
            </p>
            <p><strong>Delivery address:</strong>
              ${escapeHtml(receiver.deliveryAddress)}
            </p>
            <p>Thank you for choosing ParcelFlow.</p>
          </div>
        `
      )
    );
  }

  if (receiver.phone?.trim()) {
    tasks.push(
      sendSms(
        receiver.phone.trim(),
        `${subject}. ${message} Tracking: ${receiver.trackingNumber}. ParcelFlow.`
      )
    );
  }

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        "Receiver notification failed:",
        result.reason
      );
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export async function notifyParcelBooked(
  receiver: ReceiverNotification
): Promise<void> {
  await sendReceiverNotification(
    receiver,
    "Your parcel has been booked",
    "Your parcel booking has been received successfully."
  );
}

export async function notifyParcelDelivered(
  receiver: ReceiverNotification
): Promise<void> {
  await sendReceiverNotification(
    receiver,
    "Your parcel has been delivered",
    "Your parcel has been marked as delivered."
  );
}