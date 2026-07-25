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

export type CreateTransactionPayload = {
  serviceType: TransactionServiceType;
  serviceLabel: string;
  description: string;
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
        paymentMethod: string;
        total: number;
        itemCount: number;
        pharmacyName: string;
        items: Array<{
          productId: string;
          quantity: number;
          price: number;
          name: string;
        }>;
      };
    };

const PENDING_KEY = "saiman-web-pending-payment-v1";

function normalizeBase(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getCallServerBase() {
  return normalizeBase(process.env.NEXT_PUBLIC_CALL_SERVER_URL || "");
}

async function fetchWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getCallServerBase();
  if (!apiBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_CALL_SERVER_URL for Razorpay checkout.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const response = await fetch(`${apiBaseUrl}${path}`, {
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
