(() => {
  "use strict";
  const prices = {
    "Baby Food Guidance": 99,
    "Priority DM & Message Support": 199,
    "Family & Adult Recipe Consultation": 299,
    "1-to-1 Video Consultation": 399,
    "Premium Food Guidance": 499
  };
  const form = document.getElementById("consult-form");
  const select = document.getElementById("track");
  const message = document.getElementById("form-message");
  const submit = document.getElementById("submit-btn");
  const panel = document.getElementById("payment-panel");
  const refForm = document.getElementById("reference-form");
  const refMessage = document.getElementById("reference-message");
  const refSubmit = document.getElementById("reference-submit");
  const config = window.ANOKHA_CONFIG || {};
  const apiBase = String(config.API_BASE_URL || "").replace(/\/$/, "");
  const enabled = config.ENABLE_PUBLIC_SUBMISSIONS === true;
  const storageKey = "anokha_pending_consultation";
  let pending = null;
  function show(element, text, error = true) {
    element.hidden = false;
    element.textContent = text;
    element.classList.toggle("form-error", error);
    element.classList.toggle("success", !error);
  }
  document.querySelectorAll("[data-service]").forEach(link => {
    link.addEventListener("click", () => { select.value = link.dataset.service; });
  });
  function renderPayment(data) {
    pending = data;
    document.getElementById("payment-steps").hidden = false;
    document.getElementById("payment-done").hidden = true;
    refForm.reset();
    refMessage.hidden = true;
    refForm.querySelector("input").disabled = false;
    refSubmit.hidden = false;
    refSubmit.disabled = false;
    document.getElementById("payment-service").textContent = data.service;
    document.getElementById("payment-amount").textContent = `₹${data.amount}`;
    const upi = new URLSearchParams({ pa: "7733040468@ybl", pn: "NEHA PUNGLIA", am: String(data.amount), cu: "INR", tn: `AnokhaNayaDrama ${data.requestId.slice(0, 8)}` });
    document.getElementById("upi-pay-link").href = `upi://pay?${upi.toString()}`;
    document.getElementById("upi-qr").src = `assets/upi-${data.amount}.png`;
    panel.hidden = false;
    document.getElementById("payment-gate-note").hidden = true;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (!enabled) {
    submit.disabled = true;
    submit.textContent = "Consultation booking opening soon";
    return;
  }
  if (!apiBase) {
    submit.disabled = true;
    show(message, "Consultation service is not configured. Please contact us on WhatsApp.");
    return;
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (saved && saved.requestId && saved.submissionToken && prices[saved.service] === saved.amount) renderPayment(saved);
  } catch { /* Storage may be unavailable. */ }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.hidden = true;
    if (pending) {
      show(message, "You already have a pending request in this tab. Complete its payment reference before creating another.");
      panel.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const fields = new FormData(form);
    const payload = {
      name: String(fields.get("name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      whatsapp: String(fields.get("whatsapp") || "").trim(),
      service: String(fields.get("service") || ""),

      turnstileToken: String(
        form.querySelector('[name="cf-turnstile-response"]')?.value || ""
      ),

      details: String(fields.get("details") || "").trim(),
      preferredSlot: String(fields.get("preferredSlot") || "").trim()
    };
    if (!payload.email && !payload.whatsapp) {
      show(message, "Enter an email address or WhatsApp number."); return;
    }
    if (!Object.hasOwn(prices, payload.service) || payload.details.length < 10) {
      show(message, "Please choose a valid service and describe your requirements (at least 10 characters)."); return;
    }
    submit.disabled = true;
    submit.textContent = "Saving consultation…";
    try {
      const response = await fetch(`${apiBase}/api/consultations`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save your request.");
      if (!data.requestId || !data.submissionToken || data.amount !== prices[payload.service]) {
        throw new Error("Unexpected server response. Contact us before paying to avoid duplicate requests.");
      }
      const record = { requestId: data.requestId, submissionToken: data.submissionToken, service: payload.service, amount: data.amount, hasEmail: Boolean(payload.email) };
      try { sessionStorage.setItem(storageKey, JSON.stringify(record)); } catch { /* Storage may be unavailable. */ }
      renderPayment(record);
      show(message, "Request saved. Please pay the displayed amount and submit your transaction reference.", false);
    } catch (error) {
      show(message, error instanceof Error ? error.message : "Unable to save your request. Please try again.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Continue to UPI payment →";
    }
  });
  refForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!pending) return;
    const upiReference = String(new FormData(refForm).get("upiReference") || "").trim();
    if (!/^[0-9]{4}$/.test(upiReference)) {
      show(refMessage, "Enter exactly the last 4 digits of your UPI transaction ID."); return;
    }
    refSubmit.disabled = true;
    try {
      const response = await fetch(`${apiBase}/api/payments/submit-reference`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: pending.requestId, submissionToken: pending.submissionToken, upiReference })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not submit payment reference.");
      document.getElementById("payment-done-text").textContent = pending.hasEmail
        ? "Once your payment is confirmed, you will receive a confirmation email at the address you provided."
        : "Thank you for your request. You will hear from us shortly once your payment is confirmed.";
      document.getElementById("payment-steps").hidden = true;
      document.getElementById("payment-done").hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      message.hidden = true;
      refMessage.hidden = true;
      try { sessionStorage.removeItem(storageKey); } catch { /* Storage may be unavailable. */ }
      pending = null;
      form.reset();
    } catch (error) {
      show(refMessage, error instanceof Error ? error.message : "Please retry.");
      refSubmit.disabled = false;
    }
  });
})();
