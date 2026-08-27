const {
  json, env, required, parseBody, validateStudent, signState, razorpayRequest
} = require("./_common");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  try {
    const { student: rawStudent } = parseBody(event);
    const student = validateStudent(rawStudent);

    const fee = Number(required("MEMBERSHIP_FEE"));
    if (!Number.isFinite(fee) || fee <= 0) throw new Error("Invalid MEMBERSHIP_FEE configuration.");
    const amount = Math.round(fee * 100);
    const currency = env("CURRENCY", "INR");

    const receipt = `MEM-${Date.now().toString(36)}-${student.rollNumber.replace(/[^a-zA-Z0-9]/g,"").slice(-10)}`.slice(0, 40);
    const order = await razorpayRequest("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: {
          roll_number: student.rollNumber,
          membership_id: student.csiId
        }
      })
    });

    // Signed server state means verification does not trust a client-supplied amount/order.
    const state = signState({
      orderId: order.id,
      amount,
      currency,
      studentHash: require("crypto").createHash("sha256").update(JSON.stringify(student)).digest("hex"),
      exp: Date.now() + 30 * 60 * 1000
    }, required("RAZORPAY_KEY_SECRET"));

    return json(200, { orderId: order.id, amount, currency, state });
  } catch (err) {
    console.error("create-order:", err.message);
    return json(400, { error: err.message || "Could not create payment order." });
  }
};
