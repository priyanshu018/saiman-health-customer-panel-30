"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type TransactionServiceType =
  | "doctor_consultation"
  | "pharmacy_order"
  | "lab_booking"
  | "ambulance_booking"
  | "rental_order"
  | "hospital_booking"
  | "ctmri_booking";

export type BookingRef =
  | { kind: "lab_booking"; approvalId: string }
  | { kind: "hospital_booking"; approvalId: string }
  | { kind: "ctmri_booking"; approvalId: string }
  | { kind: "rental_order"; approvalId: string; plan: "daily" | "weekly" | "monthly" | "quarterly" }
  | { kind: "doctor_consultation"; doctorId: string; plan: "single" | "monthly" | "yearly" }
  | { kind: "pharmacy_order"; items: Array<{ productId: string; quantity: number }> };

export type CreateTransactionPayload = {
  serviceType: TransactionServiceType;
  serviceLabel: string;
  description: string;
  // Ignored server-side when bookingRef is present — kept only as a fallback
  // for service types (doctor/pharmacy) that don't use server-side pricing.
  amount: number;
  paymentMethod: string;
  providerId?: string | null;
  providerName?: string | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  metadata?: Record<string, unknown>;
  // When present, /api/payments/create-order recomputes the authoritative
  // amount server-side from the admin-approved catalog row instead of
  // trusting `amount` above.
  bookingRef?: BookingRef;
};

type CreateTransactionResponse = {
  transactionId: string;
  checkoutUrl: string;
};

type VerifyTransactionResponse = {
  transaction: {
    transactionId: string;
    receipt: string;
    amount: number;
    currency: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    paymentMethod: string;
  };
};

export type PendingPayment =
  | {
      kind: "doctor_booking";
      returnTo: string;
      redirectUri: string;
      payment: CreateTransactionPayload;
      appointment: {
        doctorId: string;
        doctorName: string;
        doctorSpecialty: string;
        hospital: string;
        fee: number;
        consultationType: string;
        appointmentDate: string;
        appointmentTime: string;
      };
    }
  | {
      kind: "pharmacy_order";
      returnTo: string;
      redirectUri: string;
      payment: CreateTransactionPayload;
      order: {
        paymentMethod: "upi" | "card" | "cod";
        pharmacyId: string | null;
        subtotal: number;
        deliveryFee: number;
        total: number;
        itemCount: number;
        pharmacyName: string;
        deliveryAddress: string;
        items: Array<{
          productId: string;
          quantity: number;
          price: number;
          name: string;
        }>;
      };
    }
  | {
      kind: "lab_booking";
      returnTo: string;
      redirectUri: string;
      payment: CreateTransactionPayload;
      booking: {
        labId: string;
        labName: string;
        labAddress?: string | null;
        city?: string | null;
        catalogTestId?: string | null;
        testName: string;
        homeCollection: boolean;
        reportTime?: string | null;
        notes?: string | null;
      };
    }
  | {
      kind: "hospital_booking" | "ctmri_booking";
      returnTo: string;
      redirectUri: string;
      payment: CreateTransactionPayload;
      booking: {
        providerId: string;
        approvalId: string;
        serviceName: string;
        appointmentDate: string;
        appointmentTime: string;
        notes?: string | null;
      };
    }
  | {
      kind: "rental_order";
      returnTo: string;
      redirectUri: string;
      payment: CreateTransactionPayload;
      booking: {
        providerId: string;
        equipmentId: string;
        equipmentName: string;
        equipmentImageUrl?: string | null;
        providerName: string;
        plan: "daily" | "weekly" | "monthly" | "quarterly";
        rentalDays: number;
        deliveryAddress: string;
        deliveryDate?: string | null;
        deliveryTimeSlot?: string | null;
      };
    };

const PENDING_KEY = "saiman-web-pending-payment-v1";

async function fetchWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof json?.error === "string"
        ? json.error
        : typeof json?.message === "string"
          ? json.message
          : `Payment request failed (${response.status}).`,
    );
  }

  return json as T;
}

export function getPendingPayment() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPayment;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_KEY);
}

export async function beginWebPayment(pending: PendingPayment) {
  if (typeof window === "undefined") return;

  const created = await fetchWithAuth<CreateTransactionResponse>("/api/payments/create-order", {
    method: "POST",
    body: JSON.stringify({
      ...pending.payment,
      redirectUri: pending.redirectUri,
    }),
  });

  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  window.location.assign(created.checkoutUrl);
}

export async function verifyWebPayment(search: URLSearchParams) {
  const status = search.get("status");
  const error = search.get("error");

  if (status !== "success") {
    throw new Error(error || "Payment was cancelled or failed.");
  }

  const pending = getPendingPayment();
  if (!pending) {
    throw new Error("No pending payment was found for this callback.");
  }

  const transactionId = search.get("transactionId");
  const razorpayPaymentId = search.get("paymentId");
  const razorpayOrderId = search.get("orderId");
  const razorpaySignature = search.get("signature");

  if (!transactionId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    throw new Error("Payment callback was incomplete. Please try again.");
  }

  const verified = await fetchWithAuth<VerifyTransactionResponse>("/api/payments/verify", {
    method: "POST",
    body: JSON.stringify({
      transactionId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    }),
  });

  return { pending, transaction: verified.transaction };
}

export async function linkTransactionToEntity(params: { transactionId: string; entityId: string; entityType: string }) {
  await fetchWithAuth<{ ok: boolean; transactionId: string }>("/api/payments/link-booking", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

type FulfillResponse = {
  entityId: string;
  entityType: string;
  alreadyFulfilled: boolean;
};

// Idempotent: safe to call more than once for the same transaction (e.g. if
// the customer refreshes the payment-callback page) — the server returns the
// existing booking instead of creating a duplicate.
export async function fulfillServiceBooking(transactionId: string, booking: Record<string, unknown>) {
  return fetchWithAuth<FulfillResponse>("/api/service-bookings/fulfill", {
    method: "POST",
    body: JSON.stringify({ transactionId, booking }),
  });
}
