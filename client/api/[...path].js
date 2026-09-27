export default async function handler(req, res) {
  try {
    const backendUrl =
      "https://parcel-management-system-8x3m-4xec8kifh.vercel.app";

    const path = req.url.replace(/^\/api/, "");

    const url = `${backendUrl}/api${path}`;

    const headers = {
      "Content-Type": "application/json",
    };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    let body;

    if (req.method !== "GET" && req.method !== "HEAD") {
      if (typeof req.body === "string") {
        body = req.body;
      } else if (req.body) {
        body = JSON.stringify(req.body);
      } else {
        body = JSON.stringify({});
      }
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });

    const responseText = await response.text();

    res.status(response.status);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json"
    );

    res.send(responseText);
  } catch (error) {
    console.error("Proxy error:", error);

    res.status(500).json({
      message: "Unable to connect to backend server",
    });
  }
}