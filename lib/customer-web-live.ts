import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type AuthUserSummary = {
  id: string;
  email: string;
  name: string;
  phone: string;
};

export type DoctorSummary = {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  city: string;
  experience: number;
  fee: number;
  rating: number;
  availability: string[];
};

export type PharmacySummary = {
  id: string;
  name: string;
  city: string;
  address: string;
  eta: string;
  rating: number;
};

export type LabTestSummary = {
  id: string;
  name: string;
  category: string;
  labName: string;
  city: string;
  price: number;
  reportTime: string;
};

export type HospitalSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  totalBeds: number | null;
};

export type AppointmentSummary = {
  id: string;
  status: string;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: string;
  fee: number;
  doctorName: string;
  doctorSpecialty: string;
  hospital: string;
};

export type CustomerProfileSummary = {
  name: string;
  email: string;
  phone: string;
  city: string;
  ayushmanHealthId: string;
  preferredLanguage: "en" | "hi";
  pushNotificationsEnabled: boolean;
  consultations: number;
  doctors: number;
  records: number;
  reports: number;
};

export type SupportTicketSummary = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  lastMessageAt: string;
};

export type InstantCallSummary = {
  id: string;
  specialty: string;
  callReason: string;
  status: string;
  statusMessage: string | null;
  preferredLanguage: string | null;
  createdAt: string;
};

function client() {
  return getSupabaseBrowserClient();
}

function text(value: unknown, fallback = "") {
  return String(value || "").trim() || fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function relationRow<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatAvailability(row: Record<string, unknown>) {
  const items = [
    row.clinic_available_time ? "Clinic" : "",
    row.video_available_time ? "Video" : "",
    row.voice_available_time ? "Voice" : "",
    row.chat_available_time ? "Chat" : "",
  ].filter(Boolean);

  return items.length ? items : ["Consultation"];
}

export async function getCurrentCustomer() {
  const supabase = client();
  const { data, error } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  const authUser = data.user;
  if (!authUser?.id || !authUser.email) return null;

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id,name,email,phone,role")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile || text(profile.role, "user") !== "user") return null;

  return {
    id: profile.id,
    email: text(profile.email, authUser.email),
    name: text(profile.name, "Customer"),
    phone: text(profile.phone),
  } satisfies AuthUserSummary;
}

export async function loginCustomer(email: string, password: string) {
  const supabase = client();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw new Error(error.message);
}

export async function signupCustomer(params: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const supabase = client();
  const email = params.email.trim().toLowerCase();
  const phone = params.phone.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        name: params.name.trim(),
        phone,
        role: "user",
      },
    },
  });

  if (error) throw new Error(error.message);
  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Signup completed without a user id. Check Supabase email confirmation settings.");
  }

  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: userId,
      name: params.name.trim(),
      email,
      phone,
      role: "user",
      verification_status: "approved",
      product_approval_required: false,
    },
    { onConflict: "id" },
  );

  if (profileError) throw new Error(profileError.message);
}

export async function logoutCustomer() {
  const supabase = client();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function fetchApprovedDoctors() {
  const supabase = client();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id,name,specialization,hospital,city,experience,fee,clinic_available_time,video_available_time,voice_available_time,chat_available_time",
    )
    .eq("role", "doctor")
    .eq("verification_status", "approved")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    name: text(row.name, "Doctor"),
    specialty: text(row.specialization, "General Physician"),
    hospital: text(row.hospital, "Online consultation"),
    city: text(row.city, "City pending"),
    experience: numberValue(row.experience),
    fee: numberValue(row.fee, 500),
    rating: 4.8,
    availability: formatAvailability(row as Record<string, unknown>),
  })) satisfies DoctorSummary[];
}

export async function fetchApprovedPharmacies() {
  const supabase = client();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,shop_name,shop_address,city")
    .in("role", ["pharmacy", "pharmacy_admin"])
    .eq("verification_status", "approved")
    .order("shop_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    name: text(row.shop_name, text(row.name, "Pharmacy")),
    city: text(row.city, "City pending"),
    address: text(row.shop_address, "Address available after order"),
    eta: "30-40 mins",
    rating: 4.7,
  })) satisfies PharmacySummary[];
}

export async function fetchApprovedLabTests() {
  const supabase = client();
  const currentQuery = await supabase
    .from("lab_test_approvals")
    .select("id,lab_id,price,status,catalog_test_id")
    .eq("status", "Approved")
    .order("submitted_at", { ascending: false });

  if (!currentQuery.error) {
    const approvalRows = currentQuery.data || [];
    const catalogIds = [...new Set(approvalRows.map((row) => row.catalog_test_id).filter(Boolean))];
    const labIds = [...new Set(approvalRows.map((row) => row.lab_id).filter(Boolean))];

    if (!catalogIds.length) return [] satisfies LabTestSummary[];

    const [catalog, labs] = await Promise.all([
      supabase
        .from("lab_test_catalog")
        .select("id,name,category,report_delivery_text")
        .in("id", catalogIds)
        .eq("is_active", true),
      supabase
        .from("users")
        .select("id,lab_name,city")
        .in("id", labIds)
        .eq("role", "lab")
        .eq("verification_status", "approved"),
    ]);

    if (catalog.error) throw new Error(catalog.error.message);
    if (labs.error) throw new Error(labs.error.message);

    const catalogById = new Map((catalog.data || []).map((row) => [row.id, row]));
    const labById = new Map((labs.data || []).map((row) => [row.id, row]));

    return approvalRows
      .map((row) => {
        const test = row.catalog_test_id ? catalogById.get(row.catalog_test_id) : null;
        const lab = row.lab_id ? labById.get(row.lab_id) : null;
        if (!test || !lab) return null;

        return {
          id: row.id,
          name: text(test.name, "Lab Test"),
          category: text(test.category, "General"),
          labName: text(lab.lab_name, "Approved Lab"),
          city: text(lab.city, "City pending"),
          price: numberValue(row.price, 0),
          reportTime: text(test.report_delivery_text, "24-48 hrs"),
        } satisfies LabTestSummary;
      })
      .filter(Boolean) as LabTestSummary[];
  }

  const legacyQuery = await supabase
    .from("lab_test_approvals")
    .select("id,test_name,category,lab_name,city,price,report_time")
    .eq("status", "Approved")
    .eq("is_active", true)
    .order("test_name", { ascending: true });

  if (legacyQuery.error) throw new Error(legacyQuery.error.message);

  return (legacyQuery.data || []).map((row) => ({
    id: row.id,
    name: text(row.test_name, "Lab Test"),
    category: text(row.category, "General"),
    labName: text(row.lab_name, "Approved Lab"),
    city: text(row.city, "City pending"),
    price: numberValue(row.price, 0),
    reportTime: text(row.report_time, "24-48 hrs"),
  })) satisfies LabTestSummary[];
}

export async function fetchApprovedHospitals() {
  const supabase = client();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,hospital_name,hospital_address,city,total_beds")
    .eq("role", "hospital")
    .eq("verification_status", "approved")
    .order("hospital_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    name: text(row.hospital_name, text(row.name, "Hospital")),
    address: text(row.hospital_address, "Address available after consultation"),
    city: text(row.city, "City pending"),
    totalBeds: row.total_beds == null ? null : numberValue(row.total_beds),
  })) satisfies HospitalSummary[];
}

export async function fetchPatientAppointments(patientId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("doctor_appointments")
    .select(
      "id,status,appointment_date,appointment_time,consultation_type,fee,doctor:users!doctor_appointments_doctor_id_fkey(name,specialization,hospital)",
    )
    .eq("patient_id", patientId)
    .order("appointment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => {
    const doctor = relationRow(row.doctor);

    return {
    id: row.id,
    status: text(row.status, "pending"),
    appointmentDate: text(row.appointment_date),
    appointmentTime: text(row.appointment_time),
    consultationType: text(row.consultation_type, "clinic"),
    fee: numberValue(row.fee, 0),
    doctorName: text(doctor?.name, "Doctor"),
    doctorSpecialty: text(doctor?.specialization, "General Physician"),
    hospital: text(doctor?.hospital, "Online consultation"),
    };
  }) satisfies AppointmentSummary[];
}

export async function fetchCustomerProfile(userId: string) {
  const supabase = client();
  const [{ data: profile, error: profileError }, { data: settings, error: settingsError }, { count: consultations, error: consultationsError }, { data: doctorsData, error: doctorsError }, { count: reports, error: reportsError }] =
    await Promise.all([
      supabase.from("users").select("name,email,phone,city").eq("id", userId).maybeSingle(),
      supabase
        .from("customer_profile_settings")
        .select("ayushman_health_id,push_notifications_enabled,preferred_language")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("doctor_appointments").select("id", { count: "exact", head: true }).eq("patient_id", userId),
      supabase.from("doctor_appointments").select("doctor_id,prescription_status").eq("patient_id", userId),
      supabase.from("lab_test_bookings").select("id", { count: "exact", head: true }).eq("patient_id", userId),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (settingsError && settingsError.code !== "PGRST116") throw new Error(settingsError.message);
  if (consultationsError) throw new Error(consultationsError.message);
  if (doctorsError) throw new Error(doctorsError.message);
  if (reportsError) throw new Error(reportsError.message);

  const uniqueDoctors = new Set((doctorsData || []).map((row) => row.doctor_id).filter(Boolean)).size;
  const sharedRecords = (doctorsData || []).filter((row) => row.prescription_status === "shared").length;

  return {
    name: text(profile?.name, "Customer"),
    email: text(profile?.email),
    phone: text(profile?.phone),
    city: text(profile?.city),
    ayushmanHealthId: text(settings?.ayushman_health_id),
    preferredLanguage: settings?.preferred_language === "hi" ? "hi" : "en",
    pushNotificationsEnabled: settings?.push_notifications_enabled !== false,
    consultations: consultations || 0,
    doctors: uniqueDoctors,
    records: sharedRecords,
    reports: reports || 0,
  } satisfies CustomerProfileSummary;
}

export async function fetchSupportTickets(userId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id,subject,category,status,priority,last_message_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    subject: text(row.subject, "Support request"),
    category: text(row.category, "General"),
    status: text(row.status, "Open"),
    priority: text(row.priority, "Normal"),
    lastMessageAt: text(row.last_message_at),
  })) satisfies SupportTicketSummary[];
}

export async function createSupportTicket(params: {
  userId: string;
  userEmail: string;
  subject: string;
  category: string;
  message: string;
}) {
  const supabase = client();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      user_id: params.userId,
      user_email: params.userEmail || null,
      subject: params.subject.trim(),
      category: params.category.trim(),
      status: "Open",
      priority: "Normal",
    })
    .select("id")
    .single();

  if (ticketError) throw new Error(ticketError.message);

  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: params.userId,
    sender_role: "customer",
    message: params.message.trim(),
  });

  if (messageError) throw new Error(messageError.message);
}

export async function fetchActiveInstantCallRequest(userId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("instant_call_requests")
    .select("id,specialty,call_reason,status,status_message,preferred_language,created_at")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  if (["completed", "cancelled", "rejected", "no_doctor_available"].includes(text(row.status))) {
    return null;
  }

  return {
    id: row.id,
    specialty: text(row.specialty),
    callReason: text(row.call_reason),
    status: text(row.status),
    statusMessage: row.status_message ?? null,
    preferredLanguage: row.preferred_language ?? null,
    createdAt: text(row.created_at),
  } satisfies InstantCallSummary;
}

export async function requestInstantCall(params: {
  specialty: string;
  callReason: string;
  symptoms?: string;
  notes?: string;
  preferredLanguage?: string;
}) {
  const supabase = client();
  const { data, error } = await supabase.rpc("request_instant_call", {
    p_specialty: params.specialty.trim(),
    p_call_reason: params.callReason.trim(),
    p_symptoms: text(params.symptoms) || null,
    p_notes: text(params.notes) || null,
    p_preferred_language: text(params.preferredLanguage) || null,
    p_family_member_name: null,
  });

  if (error) throw new Error(error.message);
  return data;
}
