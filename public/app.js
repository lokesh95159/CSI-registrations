const $ = (id) => document.getElementById(id);
let CONFIG = null;

function showMessage(text, type = "") {
  const el = $("message");
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

async function loadConfig() {
  const res = await fetch("./api/config", { cache: "no-store" });
  if (!res.ok) throw new Error("Website configuration could not be loaded.");
  CONFIG = await res.json();

  document.title = CONFIG.siteTitle;
  $("collegeName").textContent = CONFIG.collegeName;
  $("footerCollege").textContent = CONFIG.collegeName;
  $("departmentName").textContent = CONFIG.departmentName;
  $("societyName").textContent = CONFIG.societyName;
  $("societyJoinLink").href = CONFIG.societyJoinUrl || "#";
  $("fee").textContent = new Intl.NumberFormat("en-IN", { style:"currency", currency:CONFIG.currency, maximumFractionDigits:2 }).format(CONFIG.fee);
  $("validity").value = CONFIG.membershipValidity || "";
  $("address").textContent = CONFIG.collegeAddress || "";
  $("contact").textContent = [CONFIG.contactEmail, CONFIG.contactPhone].filter(Boolean).join(" • ");
}

function studentData() {
  return {
    name: $("name").value.trim(),
    rollNumber: $("rollNumber").value.trim(),
    branch: $("branch").value,
    year: $("year").value,
    phone: $("phone").value.trim(),
    email: $("email").value.trim(),
    csiId: $("csiId").value.trim(),
    validity: $("validity").value.trim()
  };
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

$("registrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!CONFIG) return showMessage("Configuration is still loading. Please try again.", "error");
  if (!e.currentTarget.reportValidity()) return;

  const btn = $("payButton");
  btn.disabled = true;
  showMessage("Creating secure payment order…");

  try {
    const student = studentData();
    const order = await postJSON("./api/create-order", { student });

    const options = {
      key: CONFIG.razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      name: CONFIG.collegeName,
      description: `${CONFIG.societyName} Membership`,
      order_id: order.orderId,
      prefill: {
        name: student.name,
        email: student.email,
        contact: student.phone
      },
      notes: {
        roll_number: student.rollNumber,
        membership_id: student.csiId
      },
      theme: {},
      modal: {
        ondismiss: () => {
          btn.disabled = false;
          showMessage("Payment window closed. No registration was submitted.", "error");
        }
      },
      handler: async function (response) {
        showMessage("Payment received. Verifying securely…");
        try {
          const verified = await postJSON("./api/verify-payment", {
            ...response,
            state: order.state,
            student
          });
          showMessage("Payment verified. Opening the final Google Form…", "success");
          window.location.assign(verified.googleFormUrl);
        } catch (err) {
          btn.disabled = false;
          showMessage(`Payment verification problem: ${err.message}. Keep your Razorpay payment ID for support.`, "error");
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function(resp) {
      btn.disabled = false;
      const reason = resp?.error?.description || "Payment failed.";
      showMessage(reason, "error");
    });
    rzp.open();
  } catch (err) {
    btn.disabled = false;
    showMessage(err.message, "error");
  }
});

loadConfig().catch(err => showMessage(err.message, "error"));
