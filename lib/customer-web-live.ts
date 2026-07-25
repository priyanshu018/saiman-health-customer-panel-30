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
  avatarUrl: string | null;
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

export type PharmacyProductSummary = {
  id: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  price: number;
  mrp: number | null;
  stock: number;
  pharmacyId: string | null;
  pharmacyName: string;
  city: string;
  imageUrl: string | null;
};

export type LabTestSummary = {
  id: string;
  name: string;
  category: string;
  labName: string;
  city: string;
  price: number;
  reportTime: string;
  imageUrl: string | null;
};

export type HospitalSummary = {
  id: string;
  name: string;
  address: string;
  city: string;
  totalBeds: number | null;
};

export type HospitalServiceSummary = {
  id: string;
  providerId: string;
  providerName: string;
  providerAddress: string;
  providerCity: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  basePrice: number;
  imageUrl: string | null;
  totalBeds: number | null;
};

export type CtmriServiceSummary = {
  id: string;
  providerId: string;
  providerName: string;
  providerAddress: string;
  providerCity: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  basePrice: number;
  imageUrl: string | null;
};

export type RentalEquipmentSummary = {
  id: string;
  name: string;
  category: string;
  description: string;
  brand: string;
  model: string;
  price: number;
  weeklyPrice: number;
  monthlyPrice: number;
  deposit: number;
  providerName: string;
  city: string;
  stock: number;
  imageUrl: string | null;
};

export type StaffingProviderSummary = {
  id: string;
  name: string;
  city: string;
  profession: string;
  experience: number | null;
  fee: number | null;
  qualifications: string;
  avatarUrl: string | null;
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

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return toStringArray(parsed);
    } catch {
      return [trimmed];
    }
  }

  return [];
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

type PharmacyApprovalRow = {
  id: string;
  name: string | null;
  sku?: string | null;
  category: string | null;
  type: string | null;
  price: number | null;
  mrp: number | null;
  stock: number | null;
  city: string | null;
  description: string | null;
  image_url: string | null;
  image_urls?: unknown;
  pharmacy_id: string | null;
  pharmacy_name: string | null;
  pharmacy_email?: string | null;
  pharmacy_phone?: string | null;
  catalog_item_id: string | null;
  status: string | null;
  is_active: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
};

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
      "id,name,avatar_url,specialization,hospital,city,experience,fee,clinic_available_time,video_available_time,voice_available_time,chat_available_time",
    )
    .eq("role", "doctor")
    .eq("verification_status", "approved")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    name: text(row.name, "Doctor"),
    avatarUrl: text(row.avatar_url) || null,
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

export async function fetchApprovedPharmacyProducts() {
  const supabase = client();

  async function loadApprovals(includeImageUrls: boolean) {
    const select = includeImageUrls
      ? "id,name,sku,category,type,price,mrp,stock,pharmacy_id,pharmacy_name,pharmacy_email,pharmacy_phone,city,latitude,longitude,description,image_url,image_urls,status,category_id,catalog_item_id,is_active"
      : "id,name,sku,category,type,price,mrp,stock,pharmacy_id,pharmacy_name,pharmacy_email,pharmacy_phone,city,latitude,longitude,description,image_url,status,category_id,catalog_item_id,is_active";

    return supabase
      .from("pharmacy_product_approvals")
      .select(select)
      .eq("status", "Approved")
      .gt("stock", 0)
      .order("name", { ascending: true });
  }

  let current = await loadApprovals(true);

  if (current.error && String(current.error.message || "").toLowerCase().includes("image_urls")) {
    current = await loadApprovals(false);
  }

  if (current.error) throw new Error(current.error.message);

  const rows = ((current.data || []) as unknown) as PharmacyApprovalRow[];
  const catalogIds = Array.from(new Set(rows.map((row) => row.catalog_item_id).filter(Boolean)));
  const catalogImages = new Map<string, string[]>();

  if (catalogIds.length) {
    const catalog = await supabase
      .from("pharmacy_catalog_items")
      .select("id,image_urls")
      .in("id", catalogIds);

    if (!catalog.error) {
      for (const row of catalog.data || []) {
        const images = toStringArray(row.image_urls);
        if (row.id && images.length) catalogImages.set(row.id, images);
      }
    }
  }

  return rows.map((row) => ({
    id: row.id,
    name: text(row.name, "Product"),
    category: text(row.category, "General"),
    subtitle: text(row.type, "Medicine"),
    description: text(row.description),
    price: numberValue(row.price, 0),
    mrp: row.mrp == null ? null : numberValue(row.mrp, 0),
    stock: numberValue(row.stock, 0),
    pharmacyId: row.pharmacy_id || null,
    pharmacyName: text(row.pharmacy_name, "Austy Pharmacy"),
    city: text(row.city, "City pending"),
    imageUrl:
      text(row.image_url) ||
      toStringArray((row as { image_urls?: unknown }).image_urls)[0] ||
      (row.catalog_item_id ? catalogImages.get(row.catalog_item_id)?.[0] || null : null),
  })) satisfies PharmacyProductSummary[];
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

    if (catalogIds.length) {
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

      const currentResults = approvalRows
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
            imageUrl: text((test as { image_url?: unknown }).image_url) || null,
          } satisfies LabTestSummary;
        })
        .filter(Boolean) as LabTestSummary[];

      if (currentResults.length) return currentResults;
    }
  }

  const legacyQuery = await supabase
    .from("lab_test_approvals")
    .select("id,test_name,category,lab_name,city,price,report_time,image_url")
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
    imageUrl: text((row as { image_url?: unknown }).image_url) || null,
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

async function fetchProviderServiceCatalogRows(table: string, ids: string[]) {
  const supabase = client();
  return supabase
    .from(table)
    .select("id,name,code,category,description,base_price,image_url,is_active")
    .in("id", ids)
    .eq("is_active", true);
}

export async function fetchApprovedHospitalServices() {
  const supabase = client();
  const approvals = await supabase
    .from("hospital_service_approvals")
    .select("id,provider_id,catalog_service_id,price,status")
    .eq("status", "Approved")
    .order("updated_at", { ascending: false });

  if (approvals.error) throw new Error(approvals.error.message);
  const rows = approvals.data || [];
  if (!rows.length) return [] satisfies HospitalServiceSummary[];

  const providerIds = Array.from(new Set(rows.map((row) => row.provider_id).filter(Boolean)));
  const catalogIds = Array.from(new Set(rows.map((row) => row.catalog_service_id).filter(Boolean)));

  const [providers, catalog] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,city,hospital_name,hospital_address,total_beds,verification_status")
      .in("id", providerIds)
      .eq("role", "hospital")
      .eq("verification_status", "approved"),
    fetchProviderServiceCatalogRows("hospital_service_catalog", catalogIds),
  ]);

  if (providers.error) throw new Error(providers.error.message);
  if (catalog.error) throw new Error(catalog.error.message);

  const providerById = new Map((providers.data || []).map((row) => [row.id, row]));
  const catalogById = new Map((catalog.data || []).map((row) => [row.id, row]));

  return rows
    .map((row) => {
      const provider = providerById.get(row.provider_id);
      const service = catalogById.get(row.catalog_service_id);
      if (!provider || !service) return null;

      return {
        id: row.id,
        providerId: row.provider_id,
        providerName: text(provider.hospital_name, text(provider.name, "Hospital")),
        providerAddress: text(provider.hospital_address, "Address available after booking"),
        providerCity: text(provider.city, "City pending"),
        serviceName: text(service.name, "Hospital Service"),
        category: text(service.category, "General"),
        description: text(service.description),
        price: numberValue(row.price, numberValue(service.base_price, 0)),
        basePrice: numberValue(service.base_price, 0),
        imageUrl: text(service.image_url) || null,
        totalBeds: provider.total_beds == null ? null : numberValue(provider.total_beds),
      } satisfies HospitalServiceSummary;
    })
    .filter(Boolean) as HospitalServiceSummary[];
}

export async function fetchApprovedCtmriServices() {
  const supabase = client();
  const approvals = await supabase
    .from("ctmri_service_approvals")
    .select("id,provider_id,catalog_service_id,price,status")
    .eq("status", "Approved")
    .order("updated_at", { ascending: false });

  if (approvals.error) throw new Error(approvals.error.message);
  const rows = approvals.data || [];
  if (!rows.length) return [] satisfies CtmriServiceSummary[];

  const providerIds = Array.from(new Set(rows.map((row) => row.provider_id).filter(Boolean)));
  const catalogIds = Array.from(new Set(rows.map((row) => row.catalog_service_id).filter(Boolean)));

  const [providers, catalog] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,city,center_name,center_address,verification_status")
      .in("id", providerIds)
      .eq("role", "ctmri")
      .eq("verification_status", "approved"),
    fetchProviderServiceCatalogRows("ctmri_service_catalog", catalogIds),
  ]);

  if (providers.error) throw new Error(providers.error.message);
  if (catalog.error) throw new Error(catalog.error.message);

  const providerById = new Map((providers.data || []).map((row) => [row.id, row]));
  const catalogById = new Map((catalog.data || []).map((row) => [row.id, row]));

  return rows
    .map((row) => {
      const provider = providerById.get(row.provider_id);
      const service = catalogById.get(row.catalog_service_id);
      if (!provider || !service) return null;

      return {
        id: row.id,
        providerId: row.provider_id,
        providerName: text(provider.center_name, text(provider.name, "Imaging Center")),
        providerAddress: text(provider.center_address, "Address available after booking"),
        providerCity: text(provider.city, "City pending"),
        serviceName: text(service.name, "Imaging Service"),
        category: text(service.category, "General"),
        description: text(service.description),
        price: numberValue(row.price, numberValue(service.base_price, 0)),
        basePrice: numberValue(service.base_price, 0),
        imageUrl: text(service.image_url) || null,
      } satisfies CtmriServiceSummary;
    })
    .filter(Boolean) as CtmriServiceSummary[];
}

export async function fetchApprovedRentalEquipment() {
  const supabase = client();
  const { data, error } = await supabase
    .from("rental_equipment_approvals")
    .select("id,name,category,owner,city,price,weekly_price,monthly_price,deposit,brand,model,description,image_url,stock,status")
    .eq("status", "Approved")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    name: text(row.name, "Equipment"),
    category: text(row.category, "Patient Care"),
    description: text(row.description),
    brand: text(row.brand),
    model: text(row.model),
    price: numberValue(row.price, 0),
    weeklyPrice: numberValue(row.weekly_price, numberValue(row.price, 0) * 7),
    monthlyPrice: numberValue(row.monthly_price, numberValue(row.price, 0) * 30),
    deposit: numberValue(row.deposit, 0),
    providerName: text(row.owner, "Verified Provider"),
    city: text(row.city, "City pending"),
    stock: numberValue(row.stock, 0),
    imageUrl: text(row.image_url) || null,
  })) satisfies RentalEquipmentSummary[];
}

export async function fetchApprovedStaffingProviders() {
  const supabase = client();
  const { data, error } = await supabase
    .from("users")
    .select("id,name,city,provider_subtype,experience,fee,qualifications,avatar_url,verification_status")
    .eq("role", "staffing")
    .eq("verification_status", "approved")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    name: text(row.name, "Verified Staff"),
    city: text(row.city, "City pending"),
    profession: text(row.provider_subtype, "Care Staff"),
    experience: row.experience == null ? null : numberValue(row.experience),
    fee: row.fee == null ? null : numberValue(row.fee),
    qualifications: text(row.qualifications),
    avatarUrl: text(row.avatar_url) || null,
  })) satisfies StaffingProviderSummary[];
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
