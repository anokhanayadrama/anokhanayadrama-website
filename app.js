(() => {
  const prices = {
    "Baby Food Guidance": 99,
    "Priority DM & Message Support": 199,
    "Family & Adult Recipe Consultation": 299,
    "1-to-1 Video Consultation": 399,
    "Premium Food Guidance": 499,
  };
  const form = document.getElementById("consult-form");
  const select = document.getElementById("track");
  const message = document.getElementById("form-message");
  const submit = document.getElementById("submit-btn");

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      select.value = link.dataset.service;
    });
  });

  function showMessage(text, isError = true) {
    message.hidden = false;
    message.textContent = text;
    message.classList.toggle("form-error", isError);
    message.classList.toggle("success", !isError);
  }

  function loadRazorpay() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Secure payment could not be loaded. Please try again."));
      document.head.appendChild(script);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.hidden = true;
    const apiBase = (window.ANOKHA_CONFIG?.API_BASE_URL || "").replace(/\/$/, "");
    if (!apiBase) {
      showMessage("The secure form and payment service is not connected yet. Please check back shortly or contact us on WhatsApp.");
      return;
    }
    const formData = new FormData(form);
    const payload = {
      service: String(formData.get("service") || ""),
      name: String(formData.get("name") || "").trim(),
      contact: String(formData.get("contact") || "").trim(),
      details: String(formData.get("details") || "").trim(),
      preferredSlot: String(formData.get("preferredSlot") || "").trim(),
    };
    if (!prices[payload.service]) {
      showMessage("Please choose one of the listed services.");
      return;
    }
    submit.disabled = true;
    submit.textContent = "Preparing secure checkout…";
    try {
      const response = await fetch(`${apiBase}/api/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "We could not save your request. Please try again.");
      if (!result.requestId || !result.orderId || !result.keyId || !result.amount) {
        throw new Error("The payment service returned an incomplete response. Please contact us before trying again.");
      }
      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: result.keyId,
        amount: result.amount,
        currency: result.currency || "INR",
        name: "AnokhaNayaDrama",
        description: payload.service,
        order_id: result.orderId,
        prefill: { name: payload.name, contact: /^\+?[0-9\s-]{8,}$/.test(payload.contact) ? payload.contact : "" },
        theme: { color: "#395846" },
        handler: async (payment) => {
          try {
            const verifyResponse = await fetch(`${apiBase}/api/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requestId: result.requestId,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_signature: payment.razorpay_signature,
              }),
            });
            if (!verifyResponse.ok) throw new Error("Verification is pending");
            showMessage("Payment received. We are verifying it securely. Your consultation details will be sent to our team after confirmation.", false);
            form.reset();
          } catch {
            showMessage("Your payment was submitted. Verification is still processing; please do not pay again. Contact us on WhatsApp if you need help.", false);
          }
        },
        modal: { ondismiss: () => showMessage("Checkout was closed. Your request is saved as unpaid; you can submit again when you are ready.") },
      });
      checkout.open();
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      submit.disabled = false;
      submit.textContent = "Continue to secure payment →";
    }
  });
})();
