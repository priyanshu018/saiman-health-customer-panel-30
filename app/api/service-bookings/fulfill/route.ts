import { NextResponse } from "next/server";

import { createSupabaseAdminClient, fetchCustomerTransaction, getAuthenticatedUser, linkTransactionToEntity } from "@/lib/payment-transactions";

type LabBookingPayload = {
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

type ProviderServiceBookingPayload = {
  providerId: string;
  approvalId: string;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  notes?: string | null;
};

type RentalOrderPayload = {
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

type FulfillBody = {
  transactionId?: string;
  booking?: LabBookingPayload | ProviderServiceBookingPayload | RentalOrderPayload;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FulfillBody;
    if (!body.transactionId || !body.booking) {
      return jsonError("Missing transaction or booking details.", 400);
    }

    const user = await getAuthenticatedUser(request.headers.get("authorization"));
    const client = createSupabaseAdminClient();
    const transaction = await fetchCustomerTransaction(client, body.transactionId);

    if (transaction.patient_id !== user.id) {
      return jsonError("This transaction does not belong to the current customer.", 403);
    }
    if (transaction.status !== "paid") {
      return jsonError("Payment has not been verified for this transaction yet.", 409);
    }

    // Idempotent: if this transaction was already fulfilled (e.g. the customer
    // refreshed the payment-callback page), return the existing booking instead
    // of creating a duplicate.
    if (transaction.entity_id && transaction.entity_type) {
      return NextResponse.json({
        entityId: transaction.entity_id,
        entityType: transaction.entity_type,
        alreadyFulfilled: true,
      });
    }

    const breakdown = (transaction.metadata?.pricingBreakdown || {}) as { itemPrice?: number; deliveryFee?: number; securityDeposit?: number };
    let entityId: string;
    let entityType: string;

    if (transaction.service_type === "lab_booking") {
      const booking = body.booking as LabBookingPayload;
      if (!booking.labId || !booking.testName) return jsonError("Missing lab booking details.", 400);

      const { data: row, error } = await client
        .from("lab_test_bookings")
        .insert({
          patient_id: user.id,
          lab_id: booking.labId,
          lab_name: booking.labName,
          lab_address: booking.labAddress || null,
          city: booking.city || null,
          status: "placed",
          payment_method: "pay_online",
          payment_status: "paid",
          home_collection: booking.homeCollection,
          report_time: booking.reportTime || null,
          subtotal: transaction.amount,
          total: transaction.amount,
          notes: booking.notes || null,
        })
        .select("id")
        .single();

      if (error) return jsonError(error.message, 500);

      const { error: itemError } = await client.from("lab_test_booking_items").insert({
        booking_id: row.id,
        approval_test_id: null,
        catalog_test_id: booking.catalogTestId || null,
        test_name: booking.testName,
        unit_price: transaction.amount,
        line_total: transaction.amount,
      });
      if (itemError) return jsonError(itemError.message, 500);

      entityId = row.id;
      entityType = "lab_test_booking";
    } else if (transaction.service_type === "hospital_booking" || transaction.service_type === "ctmri_booking") {
      const booking = body.booking as ProviderServiceBookingPayload;
      if (!booking.providerId || !booking.approvalId || !booking.serviceName) {
        return jsonError("Missing booking details.", 400);
      }

      const table = transaction.service_type === "hospital_booking" ? "hospital_service_bookings" : "ctmri_service_bookings";
      const { data: row, error } = await client
        .from(table)
        .insert({
          patient_id: user.id,
          provider_id: booking.providerId,
          approval_id: booking.approvalId,
          service_name: booking.serviceName,
          appointment_date: booking.appointmentDate,
          appointment_time: booking.appointmentTime,
          amount: transaction.amount,
          payment_status: "paid",
          status: "requested",
          notes: booking.notes || null,
        })
        .select("id")
        .single();

      if (error) return jsonError(error.message, 500);
      entityId = row.id;
      entityType = transaction.service_type === "hospital_booking" ? "hospital_service_booking" : "ctmri_service_booking";
    } else if (transaction.service_type === "rental_order") {
      const booking = body.booking as RentalOrderPayload;
      if (!booking.providerId || !booking.equipmentId || !booking.deliveryAddress) {
        return jsonError("Missing rental booking details.", 400);
      }

      const { data: row, error } = await client
        .from("rental_orders")
        .insert({
          patient_id: user.id,
          provider_id: booking.providerId,
          equipment_id: booking.equipmentId,
          equipment_name: booking.equipmentName,
          equipment_image_url: booking.equipmentImageUrl || null,
          provider_name: booking.providerName,
          plan: booking.plan,
          rental_days: Math.max(1, Math.round(booking.rentalDays || 1)),
          unit_price: breakdown.itemPrice ?? transaction.amount,
          delivery_fee: breakdown.deliveryFee ?? 0,
          security_deposit: breakdown.securityDeposit ?? 0,
          total: transaction.amount,
          status: "placed",
          payment_method: "upi",
          payment_status: "paid",
          delivery_address: booking.deliveryAddress,
          delivery_date: booking.deliveryDate || null,
          delivery_time_slot: booking.deliveryTimeSlot || null,
        })
        .select("id")
        .single();

      if (error) return jsonError(error.message, 500);
      entityId = row.id;
      entityType = "rental_order";
    } else {
      return jsonError(`Unsupported service type for fulfillment: ${transaction.service_type}`, 400);
    }

    await linkTransactionToEntity({ client, transactionId: transaction.id, entityId, entityType });

    return NextResponse.json({ entityId, entityType, alreadyFulfilled: false });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to fulfill this booking.", 500);
  }
}
