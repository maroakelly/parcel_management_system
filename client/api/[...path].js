export default async function handler(req, res) {
  try {
    const backendUrl =
      "https://parcel-management-system-8x3m-4xec8kifh.vercel.app";

    const path = req.url.replace(/^\/api/, "");
    const url = `${backendUrl}/api${path}`;

    let body = undefined;

    if (req.method !== "GET" && req.method !== "HEAD") {
      body = JSON.stringify(req.body);
    }

    const response = await fetch(url, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization
          ? { Authorization: req.headers.authorization }
          : {}),
      },
      body,
    });

    const data = await response.text();

    res.status(response.status);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json"
    );

    res.send(data);
  } catch (error) {
    console.error("Proxy error:", error);

    res.status(500).json({
      message: "Unable to connect to backend server",
    });
  }
}