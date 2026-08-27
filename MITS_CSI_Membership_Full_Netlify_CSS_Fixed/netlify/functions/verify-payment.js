const crypto = require("crypto");
const {
  json, required, parseBody, validateStudent, timingSafeHexEqual,
  verifyState, razorpayRequest, buildGoogleFormUrl
} = require("./_common");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const body = parseBody(event);
    const student = validateStudent(body.student);
    const paymentId = String(body.razorpay_payment_id || "");
    const callbackOrderId = String(body.razorpay_order_id || "");
    const signature = String(body.razorpay_signature || "");
    if (!paymentId || !callbackOrderId || !signature) throw new Error("Incomplete Razorpay payment response.");

    const state = verifyState(body.state, required("RAZORPAY_KEY_SECRET"));
    if (state.orderId !== callbackOrderId) throw new Error("Order ID does not match the secure server session.");

    const studentHash = crypto.createHash("sha256").update(JSON.stringify(student)).digest("hex");
    if (studentHash !== state.studentHash) throw new Error("Student details changed after order creation.");

    const expected = crypto.createHmac("sha256", required("RAZORPAY_KEY_SECRET"))
      .update(`${state.orderId}|${paymentId}`)
      .digest("hex");

    if (!timingSafeHexEqual(expected, signature)) throw new Error("Razorpay payment signature is invalid.");

    // Confirm payment directly with Razorpay API as an additional server-side check.
    const payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== state.orderId) throw new Error("Razorpay payment/order mismatch.");
    if (Number(payment.amount) !== Number(state.amount)) throw new Error("Razorpay payment amount mismatch.");
    if (payment.currency !== state.currency) throw new Error("Razorpay payment currency mismatch.");
    if (!["captured", "authorized"].includes(payment.status)) throw new Error(`Payment status is ${payment.status}.`);

    const paidAt = payment.created_at
      ? new Date(payment.created_at * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const googleFormUrl = buildGoogleFormUrl(student, {
      amount: `${(payment.amount / 100).toFixed(2)} ${payment.currency}`,
      status: payment.status,
      paymentId: payment.id,
      orderId: payment.order_id,
      paymentDate: paidAt,
      method: payment.method || ""
    });

    return json(200, {
      verified: true,
      paymentId: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      googleFormUrl
    });
  } catch (err) {
    console.error("verify-payment:", err.message);
    return json(400, { error: err.message || "Payment verification failed." });
  }
};
