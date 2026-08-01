import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only: uses SUPABASE_SERVICE_ROLE_KEY and RAZORPAY_KEY_SECRET.
// Only import this from Route Handlers (app/api/**), never from a "use client" file.

export type TransactionServiceType =
  | "doctor_consultation"
  | "pharmacy_order"
  | "lab_booking"
  | "ambulance_booking"
  | "rental_order"
  | "hospital_booking"
  | "ctmri_booking";

export type CustomerTransactionRow = {
  id: string;
  patient_id: string | null;
  provider_id: string | null;
  provider_name: string | null;
  service_type: TransactionServiceType;
  service_label: string;
  description: string;
  entity_type: string | null;
  entity_id: string | null;
  amount: number;
  currency: string;
  payment_method: string;
  payment_gateway: string;
  status: "created" | "pending" | "paid" | "failed" | "cancelled" | "refunded";
  refund_status: "not_requested" | "pending" | "processed" | "failed";
  refund_amount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  razorpay_refund_id: string | null;
  receipt: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type CreateOrderPayload = {
  patientId: string;
  providerId?: string | null;
  providerName?: string | null;
  serviceType: TransactionServiceType;
  serviceLabel: string;
  description: string;
  amount: number;
  paymentMethod: string;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
};

type RazorpayOrderResponse = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
};

function env(name: string) {
  return String(process.env[name] || "").trim();
}

export function getRazorpayPublicKey() {
  const key = env("RAZORPAY_KEY_ID");
  if (!key) throw new Error("Missing RAZORPAY_KEY_ID.");
  return key;
}

function getRazorpaySecretKey() {
  const key = env("RAZORPAY_KEY_SECRET");
  if (!key) throw new Error("Missing RAZORPAY_KEY_SECRET.");
  return key;
}

function getSupabaseUrl() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  return url;
}

function getSupabaseAnonKey() {
  const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return key;
}

function getSupabaseServiceRoleKey() {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return key;
}

export function createSupabaseAdminClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createSupabaseRequestClient(authHeader?: string | null) {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });
}

export async function getAuthenticatedUser(authHeader?: string | null) {
  if (!authHeader) throw new Error("Missing Authorization header.");
  const client = createSupabaseRequestClient(authHeader);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error(error?.message || "Unable to authenticate user.");
  return data.user;
}

function makeReceipt(serviceType: TransactionServiceType) {
  return `${serviceType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.slice(0, 40);
}

function toMinorUnits(amount: number) {
  return Math.round(Number(amount || 0) * 100);
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = Buffer.from(`${getRazorpayPublicKey()}:${getRazorpaySecretKey()}`).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String((json as { error?: { description?: string } })?.error?.description || `Razorpay request failed (${response.status}).`),
    );
  }

  return json as T;
}

export async function createCustomerTransactionOrder(client: SupabaseClient, payload: CreateOrderPayload) {
  const receipt = makeReceipt(payload.serviceType);
  const order = await razorpayRequest<RazorpayOrderResponse>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: toMinorUnits(payload.amount),
      currency: "INR",
      receipt,
      notes: {
        service_type: payload.serviceType,
        service_label: payload.serviceLabel,
      },
    }),
  });

  const { data, error } = await client
    .from("customer_transactions")
    .insert({
      patient_id: payload.patientId,
      provider_id: payload.providerId || null,
      provider_name: payload.providerName || null,
      service_type: payload.serviceType,
      service_label: payload.serviceLabel,
      description: payload.description,
      amount: Number(payload.amount || 0),
      currency: "INR",
      payment_method: payload.paymentMethod,
      payment_gateway: "razorpay",
      status: "pending",
      refund_status: "not_requested",
      razorpay_order_id: order.id,
      receipt,
      customer_name: payload.customer?.name || null,
      customer_email: payload.customer?.email || null,
      customer_phone: payload.customer?.phone || null,
      metadata: payload.metadata || {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerTransactionRow;
}

export async function fetchCustomerTransaction(client: SupabaseClient, transactionId: string) {
  const { data, error } = await client.from("customer_transactions").select("*").eq("id", transactionId).single();
  if (error) throw new Error(error.message);
  return data as CustomerTransactionRow;
}

export async function verifyCustomerTransaction(params: {
  client: SupabaseClient;
  transactionId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const transaction = await fetchCustomerTransaction(params.client, params.transactionId);
  if (transaction.razorpay_order_id !== params.razorpayOrderId) {
    throw new Error("Payment order mismatch.");
  }

  const crypto = await import("crypto");
  const digest = crypto
    .createHmac("sha256", getRazorpaySecretKey())
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");

  if (digest !== params.razorpaySignature) {
    throw new Error("Invalid payment signature.");
  }

  const { data, error } = await params.client
    .from("customer_transactions")
    .update({
      status: "paid",
      razorpay_payment_id: params.razorpayPaymentId,
      razorpay_signature: params.razorpaySignature,
      paid_at: new Date().toISOString(),
      failure_reason: null,
    })
    .eq("id", params.transactionId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerTransactionRow;
}

export async function linkTransactionToEntity(params: {
  client: SupabaseClient;
  transactionId: string;
  entityId: string;
  entityType: string;
}) {
  const { data, error } = await params.client
    .from("customer_transactions")
    .update({
      entity_id: params.entityId,
      entity_type: params.entityType,
    })
    .eq("id", params.transactionId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CustomerTransactionRow;
}

// ---------------------------------------------------------------------------
// Server-side authoritative pricing for lab/ctmri/hospital/rental bookings.
// The browser never supplies the amount for these service types — the price
// is always re-read from the admin-approved catalog row here, server-side,
// before a Razorpay order is created.
// ---------------------------------------------------------------------------

export type BookingRef =
  | { kind: "lab_booking"; approvalId: string }
  | { kind: "hospital_booking"; approvalId: string }
  | { kind: "ctmri_booking"; approvalId: string }
  | { kind: "rental_order"; approvalId: string; plan: "daily" | "weekly" | "monthly" | "quarterly" }
  | { kind: "doctor_consultation"; doctorId: string; plan: "single" | "monthly" | "yearly" }
  | { kind: "pharmacy_order"; items: Array<{ productId: string; quantity: number }> };

export type BookingPricing = {
  amount: number;
  breakdown: {
    itemPrice: number;
    deliveryFee: number;
    securityDeposit: number;
  };
};

const RENTAL_DELIVERY_FEE = 40;

export async function computeBookingPricing(client: SupabaseClient, ref: BookingRef): Promise<BookingPricing> {
  if (ref.kind === "lab_booking") {
    const { data, error } = await client.from("lab_test_approvals").select("price,status").eq("id", ref.approvalId).single();
    if (error || !data || String(data.status) !== "Approved") throw new Error("This lab test is no longer available.");
    const amount = Number(data.price || 0);
    return { amount, breakdown: { itemPrice: amount, deliveryFee: 0, securityDeposit: 0 } };
  }

  if (ref.kind === "hospital_booking") {
    const { data, error } = await client.from("hospital_service_approvals").select("price,status").eq("id", ref.approvalId).single();
    if (error || !data || String(data.status) !== "Approved") throw new Error("This hospital service is no longer available.");
    const amount = Number(data.price || 0);
    return { amount, breakdown: { itemPrice: amount, deliveryFee: 0, securityDeposit: 0 } };
  }

  if (ref.kind === "ctmri_booking") {
    const { data, error } = await client.from("ctmri_service_approvals").select("price,status").eq("id", ref.approvalId).single();
    if (error || !data || String(data.status) !== "Approved") throw new Error("This imaging service is no longer available.");
    const amount = Number(data.price || 0);
    return { amount, breakdown: { itemPrice: amount, deliveryFee: 0, securityDeposit: 0 } };
  }

  if (ref.kind === "rental_order") {
    const { data, error } = await client
      .from("rental_equipment_approvals")
      .select("price,weekly_price,monthly_price,deposit,status")
      .eq("id", ref.approvalId)
      .single();
    if (error || !data || String(data.status) !== "Approved") throw new Error("This rental equipment is no longer available.");

    const itemPrice =
      ref.plan === "weekly"
        ? Number(data.weekly_price || data.price || 0)
        : ref.plan === "monthly" || ref.plan === "quarterly"
          ? Number(data.monthly_price || data.price || 0)
          : Number(data.price || 0);
    const securityDeposit = Number(data.deposit || 0);
    const amount = itemPrice + RENTAL_DELIVERY_FEE + securityDeposit;

    return { amount, breakdown: { itemPrice, deliveryFee: RENTAL_DELIVERY_FEE, securityDeposit } };
  }

  if (ref.kind === "doctor_consultation") {
    const { data, error } = await client
      .from("users")
      .select("fee,role,verification_status")
      .eq("id", ref.doctorId)
      .single();
    if (error || !data || data.role !== "doctor" || data.verification_status !== "approved") {
      throw new Error("This doctor is no longer available.");
    }
    const baseFee = Number(data.fee || 0);
    const multiplier = ref.plan === "monthly" ? 3 : ref.plan === "yearly" ? 10 : 1;
    const amount = baseFee * multiplier;
    return { amount, breakdown: { itemPrice: amount, deliveryFee: 0, securityDeposit: 0 } };
  }

  // pharmacy_order
  const productIds = ref.items.map((item) => item.productId);
  const { data, error } = await client
    .from("pharmacy_product_approvals")
    .select("id,price,status")
    .in("id", productIds)
    .eq("status", "Approved");
  if (error) throw new Error(error.message);

  const priceById = new Map((data || []).map((row) => [String(row.id), Number(row.price || 0)]));
  let itemPrice = 0;
  for (const item of ref.items) {
    const price = priceById.get(item.productId);
    if (price === undefined) throw new Error("One or more items in your cart are no longer available.");
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 0));
    itemPrice += price * quantity;
  }

  return { amount: itemPrice, breakdown: { itemPrice, deliveryFee: 0, securityDeposit: 0 } };
}
