# AnokhaNayaDrama website — GitHub Pages frontend

This is the static frontend for `anokhanayadrama.naxus.io`. It preserves the existing page sections, brand palette, pricing and logo while separating private form/payment operations into a backend API.

## Important status

- This folder contains the public frontend only.
- `config.js` intentionally has an empty `API_BASE_URL`. The form will not accept submissions until the Cloudflare Worker backend is deployed and its URL is added there.
- The Razorpay checkout flow expects the backend to create an order and return `requestId`, `orderId`, `keyId`, `amount` (in paise), and optionally `currency`.
- The backend must verify payment signatures and the Razorpay webhook before marking a request paid or sending email/WhatsApp notifications. Do not send notifications based only on the browser callback.
- Never put Resend, Razorpay secret, WhatsApp access token, or webhook secret values in this repository or in `config.js`.

## Publish on GitHub Pages

1. Upload all files and folders in this project to the root of `anokhanayadrama/anokhanayadrama-website` on the `main` branch.
2. In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` will publish the static files.
4. Keep the `CNAME` file. Configure the matching DNS record at Namecheap only when GitHub Pages gives the exact DNS target and domain verification instructions.

## Backend API contract expected by `app.js`

- `POST /api/consultations` — JSON body: `service`, `name`, `contact`, `details`, `preferredSlot`. It must validate fields, store an unpaid request, create a Razorpay order, and return `{ requestId, orderId, keyId, amount, currency }`.
- `POST /api/payments/verify` — JSON body: `requestId`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`. Verify the signature server-side. The Razorpay webhook remains the authoritative payment confirmation and should trigger idempotent email + WhatsApp notification only after verified capture.

The frontend deliberately does not use a direct UPI link because a UPI deep link cannot reliably confirm payment to the website.
