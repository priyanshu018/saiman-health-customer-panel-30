import { NextResponse } from "next/server";

import { createSupabaseAdminClient, fetchCustomerTransaction, getRazorpayPublicKey } from "@/lib/payment-transactions";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const transactionId = url.searchParams.get("transactionId")?.trim();
    const redirectUri = url.searchParams.get("redirectUri")?.trim();
    if (!transactionId || !redirectUri) {
      return htmlResponse("<h1>Invalid payment request.</h1>");
    }

    const client = createSupabaseAdminClient();
    const transaction = await fetchCustomerTransaction(client, transactionId);
    if (!transaction.razorpay_order_id) {
      return htmlResponse("<h1>Payment order was not created.</h1>");
    }

    const pageData = {
      transactionId: transaction.id,
      redirectUri,
      title: transaction.service_label,
      amount: transaction.amount,
      key: getRazorpayPublicKey(),
      orderId: transaction.razorpay_order_id,
      currency: transaction.currency || "INR",
      description: transaction.description,
      customerName: transaction.customer_name || "",
      customerEmail: transaction.customer_email || "",
      customerPhone: transaction.customer_phone || "",
      serviceType: transaction.service_type,
    };

    return htmlResponse(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Secure Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #eff6ff; color: #0f172a; display: grid; min-height: 100vh; place-items: center; }
      .card { width: min(92vw, 420px); background: #fff; border-radius: 18px; padding: 28px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18); text-align: center; }
      .title { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
      .sub { color: #475569; line-height: 1.5; margin-bottom: 20px; }
      .amount { font-size: 32px; font-weight: 900; color: #2563eb; margin-bottom: 22px; }
      .btn { border: 0; background: #2563eb; color: #fff; border-radius: 12px; padding: 14px 18px; font-size: 15px; font-weight: 800; width: 100%; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">Complete Your Payment</div>
      <div class="sub">${escapeHtml(transaction.service_label)}</div>
      <div class="amount">Rs ${transaction.amount.toLocaleString("en-IN")}</div>
      <button class="btn" id="pay-now">Pay Securely</button>
    </div>
    <script>
      const pageData = ${JSON.stringify(pageData)};
      const redirectBase = pageData.redirectUri;
      const options = {
        key: pageData.key,
        amount: Math.round(Number(pageData.amount || 0) * 100),
        currency: pageData.currency,
        name: "Saiman Health",
        description: pageData.description,
        order_id: pageData.orderId,
        prefill: {
          name: pageData.customerName,
          email: pageData.customerEmail,
          contact: pageData.customerPhone,
        },
        notes: {
          transaction_id: pageData.transactionId,
          service_type: pageData.serviceType,
        },
        theme: { color: "#2563eb" },
        handler(response) {
          const url = new URL(redirectBase);
          url.searchParams.set("status", "success");
          url.searchParams.set("transactionId", pageData.transactionId);
          url.searchParams.set("orderId", response.razorpay_order_id || "");
          url.searchParams.set("paymentId", response.razorpay_payment_id || "");
          url.searchParams.set("signature", response.razorpay_signature || "");
          window.location.replace(url.toString());
        },
        modal: {
          ondismiss() {
            const url = new URL(redirectBase);
            url.searchParams.set("status", "cancelled");
            url.searchParams.set("transactionId", pageData.transactionId);
            url.searchParams.set("error", "Payment was cancelled.");
            window.location.replace(url.toString());
          }
        }
      };
      const openCheckout = () => {
        const rz = new window.Razorpay(options);
        rz.on("payment.failed", function (response) {
          const url = new URL(redirectBase);
          url.searchParams.set("status", "failed");
          url.searchParams.set("transactionId", pageData.transactionId);
          url.searchParams.set("error", response.error && response.error.description ? response.error.description : "Payment failed.");
          window.location.replace(url.toString());
        });
        rz.open();
      };
      document.getElementById("pay-now").addEventListener("click", openCheckout);
      window.addEventListener("load", openCheckout);
    </script>
  </body>
</html>`);
  } catch (error) {
    return htmlResponse(`<h1>${escapeHtml(error instanceof Error ? error.message : "Unable to open checkout.")}</h1>`);
  }
}
