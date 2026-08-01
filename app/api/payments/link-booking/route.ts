import { NextResponse } from "next/server";

import { createSupabaseAdminClient, getAuthenticatedUser, linkTransactionToEntity } from "@/lib/payment-transactions";

type LinkBody = {
  transactionId?: string;
  entityId?: string;
  entityType?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LinkBody;
    if (!body.transactionId || !body.entityId || !body.entityType) {
      return jsonError("Missing transaction link details.", 400);
    }

    await getAuthenticatedUser(request.headers.get("authorization"));
    const client = createSupabaseAdminClient();
    const transaction = await linkTransactionToEntity({
      client,
      transactionId: body.transactionId,
      entityId: body.entityId,
      entityType: body.entityType,
    });

    return NextResponse.json({ ok: true, transactionId: transaction.id });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to link transaction.", 500);
  }
}
