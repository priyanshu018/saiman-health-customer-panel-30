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
  // catalog row and ignores whatever amount the browser sent. Only the
  // lab/ctmri/hospital/rental booking flows send this — doctor_consultation
  // and pharmacy_order are unaffected (unchanged from the earlier P0 fix).
  bookingRef?: BookingRef;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

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

    const user = await getAuthenticatedUser(request.headers.get("authorization"));
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

    const url = new URL(request.url);
    url.pathname = "/api/payments/checkout";
    url.search = "";
    url.searchParams.set("transactionId", transaction.id);
    url.searchParams.set("redirectUri", redirectUri);

    return NextResponse.json({
      transactionId: transaction.id,
      checkoutUrl: url.toString(),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to create payment order.", 500);
  }
}
