export default async function handler(req, res) {
  try {
    const backendUrl =
      "https://parcel-management-system-8x3m-4xec8kifh.vercel.app";

    const path = req.url.replace(/^\/api/, "");

    const url = `${backendUrl}/api${path}`;

    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json",
    };

    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    let body;

    if (req.method !== "GET" && req.method !== "HEAD") {
      body =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {});
    }

    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });

    const contentType =
      response.headers.get("content-type") || "application/json";

    const data = await response.text();

    res.status(response.status);
    res.setHeader("Content-Type", contentType);
    res.send(data);
  } catch (error) {
    console.error("Proxy error:", error);

    res.status(500).json({
      message: "Unable to connect to backend server",
    });
  }
}