const crypto = require("crypto");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    },
    body: JSON.stringify(body)
  };
}

function env(name, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

function required(name) {
  const value = env(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); }
  catch { throw new Error("Invalid request body."); }
}

function clean(value, max = 150) {
  return String(value ?? "").trim().slice(0, max);
}

function validateStudent(raw) {
  const s = {
    name: clean(raw?.name, 100),
    rollNumber: clean(raw?.rollNumber, 40),
    branch: clean(raw?.branch, 60),
    year: clean(raw?.year, 30),
    phone: clean(raw?.phone, 15),
    email: clean(raw?.email, 120),
    csiId: clean(raw?.csiId, 60),
    validity: clean(raw?.validity, 50)
  };
  for (const [k,v] of Object.entries(s)) {
    if (!v) throw new Error(`Missing student field: ${k}`);
  }
  if (!/^[0-9]{10}$/.test(s.phone)) throw new Error("Phone number must contain 10 digits.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) throw new Error("Enter a valid email address.");
  return s;
}

function timingSafeHexEqual(a, b) {
  try {
    const A = Buffer.from(String(a), "hex");
    const B = Buffer.from(String(b), "hex");
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  } catch { return false; }
}

function signState(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(encoded).digest("hex");
  return `${encoded}.${sig}`;
}

function verifyState(token, secret) {
  const [encoded, sig] = String(token || "").split(".");
  if (!encoded || !sig) throw new Error("Invalid payment state.");
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("hex");
  if (!timingSafeHexEqual(expected, sig)) throw new Error("Payment state verification failed.");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || Date.now() > payload.exp) throw new Error("Payment session expired.");
  return payload;
}

async function razorpayRequest(path, options = {}) {
  const keyId = required("RAZORPAY_KEY_ID");
  const keySecret = required("RAZORPAY_KEY_SECRET");
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      "authorization": `Basic ${auth}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.description || data?.error?.reason || "Razorpay request failed.";
    throw new Error(msg);
  }
  return data;
}

function formEntry(name) {
  const n = env(name);
  return n ? `entry.${n.replace(/^entry\./, "")}` : "";
}

function buildGoogleFormUrl(student, payment) {
  const base = env("GOOGLE_FORM_URL", "https://forms.gle/jo8zwQNdbx9QqR2E7");
  let url;
  try {
    url = new URL(base);
  } catch {
    return "https://forms.gle/jo8zwQNdbx9QqR2E7";
  }

  const pairs = [
    ["GOOGLE_ENTRY_NAME", student.name],
    ["GOOGLE_ENTRY_ROLL_NUMBER", student.rollNumber],
    ["GOOGLE_ENTRY_BRANCH", student.branch],
    ["GOOGLE_ENTRY_YEAR", student.year],
    ["GOOGLE_ENTRY_PHONE", student.phone],
    ["GOOGLE_ENTRY_EMAIL", student.email],
    ["GOOGLE_ENTRY_CSI_ID", student.csiId],
    ["GOOGLE_ENTRY_VALIDITY", student.validity],
    ["GOOGLE_ENTRY_AMOUNT", payment.amount],
    ["GOOGLE_ENTRY_PAYMENT_STATUS", payment.status],
    ["GOOGLE_ENTRY_PAYMENT_ID", payment.paymentId],
    ["GOOGLE_ENTRY_ORDER_ID", payment.orderId],
    ["GOOGLE_ENTRY_PAYMENT_DATE", payment.paymentDate],
    ["GOOGLE_ENTRY_PAYMENT_METHOD", payment.method]
  ];

  url.searchParams.set("usp", "pp_url");
  for (const [envName, value] of pairs) {
    const entry = formEntry(envName);
    if (entry && value !== undefined && value !== null) url.searchParams.set(entry, String(value));
  }
  return url.toString();
}

module.exports = {
  json, env, required, parseBody, validateStudent, timingSafeHexEqual,
  signState, verifyState, razorpayRequest, buildGoogleFormUrl
};
