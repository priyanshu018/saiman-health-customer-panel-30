import { NextResponse } from "next/server";

import { createSupabaseAdminClient, getAuthenticatedUser, verifyCustomerTransaction } from "@/lib/payment-transactions";

type VerifyBody = {
  transactionId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody;
    if (!body.transactionId || !body.razorpayOrderId || !body.razorpayPaymentId || !body.razorpaySignature) {
      return jsonError("Missing payment verification details.", 400);
    }

    await getAuthenticatedUser(request.headers.get("authorization"));
    const client = createSupabaseAdminClient();
    const transaction = await verifyCustomerTransaction({
      client,
      transactionId: body.transactionId,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
    });

    return NextResponse.json({
      transaction: {
        transactionId: transaction.id,
        receipt: transaction.receipt,
        amount: transaction.amount,
        currency: transaction.currency,
        razorpayOrderId: transaction.razorpay_order_id,
        razorpayPaymentId: transaction.razorpay_payment_id,
        paymentMethod: transaction.payment_method,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to verify payment.", 500);
  }
}
