import { NextResponse } from "next/server";

import {
  createCustomerTransactionOrder,
  createSupabaseAdminClient,
  getAuthenticatedUser,
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
    if (!Number.isFinite(body.amount) || Number(body.amount) <= 0) {
      return jsonError("Amount must be greater than zero.", 400);
    }
    if (!redirectUri) {
      return jsonError("Missing payment redirect URI.", 400);
    }

    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    const client = createSupabaseAdminClient();
    const transaction = await createCustomerTransactionOrder(client, {
      patientId: user.id,
      providerId: body.providerId || null,
      providerName: body.providerName || null,
      serviceType: body.serviceType,
      serviceLabel: body.serviceLabel,
      description: body.description,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod || "online",
      customer: body.customer || null,
      metadata: body.metadata || {},
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
