import { NextResponse } from "next/server";

import {
  computeBookingPricing,
  createCustomerTransactionOrder,
  createSupabaseAdminClient,
  getAuthenticatedUser,
  type BookingRef,
  type TransactionServiceType,
} from "@/lib/payment-transactions";

type CreateOrderBody = {
  serviceType?: TransactionServiceType;
  serviceLabel?: string;
  description?: string;
  amount?: number;
  paymentMethod?: string;
  providerId?: string | null;
  providerName?: string | null;
  redirectUri?: string;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
  // When present, the server re-derives `amount` from the admin-approved
  // catalog/doctor/product data and ignores whatever amount the browser
  // sent. All six priced service types (doctor, pharmacy, lab, ctmri,
  // hospital, rental) send this — ambulance_booking has no fixed catalog
  // price and is the only type still trusting the client-sent amount.
  bookingRef?: BookingRef;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Service types with a real admin-approved/catalog price. A request for any
// of these MUST carry a bookingRef so the amount is re-derived server-side —
// never trust a client-sent amount for a priced service. ambulance_booking
// is intentionally excluded: it has no fixed catalog price to re-derive from.
const PRICED_SERVICE_TYPES: TransactionServiceType[] = [
  "doctor_consultation",
  "pharmacy_order",
  "lab_booking",
  "hospital_booking",
  "ctmri_booking",
  "rental_order",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    const redirectUri = String(body.redirectUri || "").trim();
    if (!body.serviceType || !body.serviceLabel || !body.description) {
      return jsonError("Missing required transaction details.", 400);
    }
    if (!redirectUri) {
      return jsonError("Missing payment redirect URI.", 400);
    }

    // The Razorpay checkout page and the customer's own browser eventually
    // navigate to redirectUri — it must stay on this app's own origin, never
    // an attacker-supplied external URL (open-redirect guard).
    const requestOrigin = new URL(request.url).origin;
    let redirectOrigin: string;
    try {
      redirectOrigin = new URL(redirectUri).origin;
    } catch {
      return jsonError("Invalid payment redirect URI.", 400);
    }
    if (redirectOrigin !== requestOrigin) {
      return jsonError("Payment redirect URI must be on this app's origin.", 400);
    }

    if (PRICED_SERVICE_TYPES.includes(body.serviceType) && !body.bookingRef) {
      return jsonError("This service requires a priced booking reference.", 400);
    }

    const authHeader = request.headers.get("authorization");
    const user = await getAuthenticatedUser(authHeader);
    const client = createSupabaseAdminClient();

    let amount = Number(body.amount);
    let pricingBreakdown: Record<string, number> | null = null;
    if (body.bookingRef) {
      const pricing = await computeBookingPricing(client, body.bookingRef);
      amount = pricing.amount;
      pricingBreakdown = pricing.breakdown;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("Amount must be greater than zero.", 400);
    }

    const transaction = await createCustomerTransactionOrder(client, {
      patientId: user.id,
      providerId: body.providerId || null,
      providerName: body.providerName || null,
      serviceType: body.serviceType,
      serviceLabel: body.serviceLabel,
      description: body.description,
      amount,
      paymentMethod: body.paymentMethod || "online",
      customer: body.customer || null,
      metadata: {
        ...(body.metadata || {}),
        ...(body.bookingRef ? { bookingRef: body.bookingRef, pricingBreakdown } : {}),
      },
    });

    // The checkout page is reached via a plain top-level browser navigation
    // (window.location.assign), which can't carry an Authorization header —
    // so the bearer token is passed as a one-time-use query param instead,
    // and the checkout route re-validates it server-side against the
    // transaction's own patient_id before showing any payment/customer data.
    const url = new URL(request.url);
    url.pathname = "/api/payments/checkout";
    url.search = "";
    url.searchParams.set("transactionId", transaction.id);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("token", String(authHeader || "").replace(/^Bearer\s+/i, ""));

    return NextResponse.json({
      transactionId: transaction.id,
      checkoutUrl: url.toString(),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create payment order.", 500);
  }
}
