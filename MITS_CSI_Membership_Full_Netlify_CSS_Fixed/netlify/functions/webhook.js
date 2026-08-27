const crypto = require("crypto");
const { json, env, timingSafeHexEqual } = require("./_common");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  const secret = env("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return json(503, { error: "Webhook secret is not configured." });

  const received = event.headers["x-razorpay-signature"] || event.headers["X-Razorpay-Signature"] || "";
  const raw = event.body || "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  if (!timingSafeHexEqual(expected, received)) return json(401, { error: "Invalid webhook signature." });

  // Google Form remains the registration database. This endpoint intentionally
  // performs no database write; it validates and acknowledges Razorpay events.
  console.log("Verified Razorpay webhook:", JSON.parse(raw)?.event || "unknown");
  return json(200, { ok: true });
};
