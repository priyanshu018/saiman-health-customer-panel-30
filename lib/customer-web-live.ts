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
  reviewCount: number;
  availability: string[];
};

export type DoctorSpecializationSummary = {
  id: string;
  name: string;
  description: string | null;
  iconKey: string;
  isActive: boolean;
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
  labId: string;
  catalogTestId: string | null;
  name: string;
  category: string;
  labName: string;
  labAddress: string;
  city: string;
  price: number;
  homeCollection: boolean;
  nablAccredited: boolean;
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
  providerId: string | null;
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
  doctorId: string | null;
  doctorName: string | null;
  createdAt: string;
};

function client() {
  return getSupabaseBrowserClient();
}

function text(value: unknown, fallback = "") {
  return String(value || "").trim() || fallback;
}

// Admin-entered catalog names sometimes come through as ALL CAPS or
// all-lowercase raw strings ("TONSILLECTOMY", "rhinoplasty"). Normalize to
// title case for display without touching the underlying data — never shown
// to the customer as a raw, inconsistent-cased string.
function toTitleCase(value: string) {
  if (!value) return value;
  // Leave already-mixed-case strings alone (e.g. "MRI", "CT Scan") so we
  // don't mangle legitimate acronyms — only normalize strings that are
  // entirely upper or entirely lower case.
  if (value !== value.toUpperCase() && value !== value.toLowerCase()) return value;
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
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

  return items.length ? items : ["Contact for availability"];
}

const FALLBACK_DOCTOR_SPECIALIZATIONS: DoctorSpecializationSummary[] = [
  { id: "general-physician", name: "General Physician", description: null, iconKey: "person", isActive: true },
  { id: "cardiologist", name: "Cardiologist", description: null, iconKey: "favorite-border", isActive: true },
  { id: "dermatologist", name: "Dermatologist", description: null, iconKey: "face", isActive: true },
  { id: "paediatrician", name: "Paediatrician", description: null, iconKey: "child-care", isActive: true },
  { id: "neurologist", name: "Neurologist", description: null, iconKey: "psychology", isActive: true },
  { id: "gynaecologist", name: "Gynaecologist", description: null, iconKey: "pregnant-woman", isActive: true },
  { id: "orthopaedic", name: "Orthopaedic", description: null, iconKey: "healing", isActive: true },
  { id: "ent-specialist", name: "ENT Specialist", description: null, iconKey: "hearing", isActive: true },
];

const DOCTOR_SPECIALIZATION_ICON_BY_NAME: Record<string, string> = {
  All: "medical-services",
  "General Physician": "person",
  Cardiologist: "favorite-border",
  Dermatologist: "face",
  Paediatrician: "child-care",
  Neurologist: "psychology",
  Gynaecologist: "pregnant-woman",
  Orthopaedic: "healing",
  "ENT Specialist": "hearing",
  Ophthalmologist: "visibility",
  Dentist: "medical-services",
  Psychiatrist: "self-improvement",
  Neurology: "psychology",
  Cardiology: "favorite-border",
  Orthopedics: "healing",
  Ophthalmology: "visibility",
  ENT: "hearing",
  Gastroenterology: "vaccines",
  Pulmonology: "air",
  Oncology: "biotech",
  Urology: "water-drop",
  Nephrology: "water-drop",
  Pathology: "science",
  Dental: "medical-services",
  Dermatology: "face-retouching-natural",
  Radiology: "monitor-heart",
  Emergency: "emergency",
  Paediatrics: "child-care",
  Gynaecology: "pregnant-woman",
};

const SUPPORTED_DOCTOR_SPECIALIZATION_ICON_KEYS = new Set([
  "medical-services",
  "person",
  "favorite-border",
  "face",
  "face-retouching-natural",
  "child-care",
  "psychology",
  "pregnant-woman",
  "healing",
  "hearing",
  "visibility",
  "self-improvement",
  "vaccines",
  "air",
  "biotech",
  "water-drop",
  "science",
  "monitor-heart",
  "emergency",
]);

function normalizeDoctorSpecializationIcon(name: string, iconKey?: string | null) {
  const normalizedIconKey = iconKey?.trim();
  if (normalizedIconKey && SUPPORTED_DOCTOR_SPECIALIZATION_ICON_KEYS.has(normalizedIconKey)) {
    return normalizedIconKey;
  }
  return DOCTOR_SPECIALIZATION_ICON_BY_NAME[name] || "medical-services";
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

async function fetchDoctorRatings(doctorIds: string[]) {
  const ratings = new Map<string, { averageRating: number; totalReviews: number }>();
  const uniqueIds = Array.from(new Set(doctorIds.filter(Boolean)));
  if (!uniqueIds.length) return ratings;

  const supabase = client();
  const { data, error } = await supabase
    .from("doctor_reviews")
    .select("doctor_id,rating")
    .in("doctor_id", uniqueIds)
    .eq("moderation_status", "visible");

  if (error) return ratings;

  const grouped = new Map<string, number[]>();
  for (const row of data || []) {
    const list = grouped.get(row.doctor_id) || [];
    list.push(numberValue(row.rating));
    grouped.set(row.doctor_id, list);
  }

  grouped.forEach((values, doctorId) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    ratings.set(doctorId, {
      averageRating: Number((total / values.length).toFixed(1)),
      totalReviews: values.length,
    });
  });

  return ratings;
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
  const rows = data || [];
  const ratings = await fetchDoctorRatings(rows.map((row) => row.id));

  return rows.map((row) => {
    const rating = ratings.get(row.id);
    return {
      id: row.id,
      name: text(row.name, "Doctor"),
      avatarUrl: text(row.avatar_url) || null,
      specialty: text(row.specialization, "General Physician"),
      hospital: text(row.hospital, "Hospital not specified"),
      city: text(row.city, "Location not specified"),
      experience: numberValue(row.experience),
      fee: numberValue(row.fee, 500),
      rating: rating?.averageRating || 0,
      reviewCount: rating?.totalReviews || 0,
      availability: formatAvailability(row as Record<string, unknown>),
    };
  }) satisfies DoctorSummary[];
}

export async function fetchDoctorSpecializations(options?: { includeInactive?: boolean }) {
  const supabase = client();

  try {
    const query = supabase
      .from("doctor_specializations")
      .select("id,name,description,icon_key,is_active")
      .order("name", { ascending: true });

    const { data, error } = options?.includeInactive ? await query : await query.eq("is_active", true);
    if (error) throw new Error(error.message);

    if (!data?.length) {
      return FALLBACK_DOCTOR_SPECIALIZATIONS.filter((item) => options?.includeInactive || item.isActive);
    }

    return data.map((row) => ({
      id: String(row.id),
      name: text(row.name, "General Physician"),
      description: text(row.description) || null,
      iconKey: normalizeDoctorSpecializationIcon(text(row.name, "General Physician"), text(row.icon_key)),
      isActive: row.is_active !== false,
    })) satisfies DoctorSpecializationSummary[];
  } catch {
    return FALLBACK_DOCTOR_SPECIALIZATIONS.filter((item) => options?.includeInactive || item.isActive);
  }
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
    city: text(row.city, "Location not specified"),
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
    pharmacyName: text(row.pharmacy_name, "Saiman Pharmacy"),
    city: text(row.city, "Location not specified"),
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
          .select("id,lab_name,city,nabl_accredited")
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
            labId: row.lab_id,
            catalogTestId: row.catalog_test_id || null,
            name: text(test.name, "Lab Test"),
            category: text(test.category, "General"),
            labName: text(lab.lab_name, "Approved Lab"),
            labAddress: "Address shared after booking",
            city: text(lab.city, "Location not specified"),
            price: numberValue(row.price, 0),
            homeCollection: true,
            nablAccredited: Boolean((lab as { nabl_accredited?: unknown }).nabl_accredited),
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
    .select("id,test_name,category,lab_name,city,price,home_collection,report_time,nabl_accredited,image_url,lab_id,catalog_test_id")
    .eq("status", "Approved")
    .eq("is_active", true)
    .order("test_name", { ascending: true });

  if (legacyQuery.error) throw new Error(legacyQuery.error.message);

  return (legacyQuery.data || []).map((row) => ({
    id: row.id,
    labId: row.lab_id,
    catalogTestId: row.catalog_test_id || null,
    name: text(row.test_name, "Lab Test"),
    category: text(row.category, "General"),
    labName: text(row.lab_name, "Approved Lab"),
    labAddress: "Address shared after booking",
    city: text(row.city, "Location not specified"),
    price: numberValue(row.price, 0),
    homeCollection: (row as { home_collection?: unknown }).home_collection !== false,
    nablAccredited: Boolean((row as { nabl_accredited?: unknown }).nabl_accredited),
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
    city: text(row.city, "Location not specified"),
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
        providerCity: text(provider.city, "Location not specified"),
        serviceName: toTitleCase(text(service.name, "Hospital Service")),
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
        providerCity: text(provider.city, "Location not specified"),
        serviceName: toTitleCase(text(service.name, "Imaging Service")),
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
    .select("id,name,category,owner,city,price,weekly_price,monthly_price,deposit,brand,model,description,image_url,stock,status,submitted_by_id")
    .eq("status", "Approved")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    providerId: row.submitted_by_id || null,
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
    city: text(row.city, "Location not specified"),
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
    city: text(row.city, "Location not specified"),
    profession: text(row.provider_subtype, "Care Staff"),
    experience: row.experience == null ? null : numberValue(row.experience),
    fee: row.fee == null ? null : numberValue(row.fee),
    qualifications: text(row.qualifications),
    avatarUrl: text(row.avatar_url) || null,
  })) satisfies StaffingProviderSummary[];
}

export const STAFF_TYPES = ["Nurse", "Physiotherapist", "Caregiver", "Doctor", "Home Assistant", "Lab Technician"] as const;
export const STAFFING_DURATIONS = [4, 8, 12, 24] as const;

export type StaffingBookingSummary = {
  id: string;
  staffType: string;
  numberOfStaff: number;
  status: string;
  paymentStatus: string;
  scheduledDate: string;
  scheduledTime: string;
  durationHours: number;
  fullAddress: string;
  city: string;
  patientCondition: string;
  specialInstructions: string;
  totalAmount: number;
  staffName: string | null;
  staffPhone: string | null;
  createdAt: string;
};

function mapStaffingBookingRow(row: Record<string, unknown>): StaffingBookingSummary {
  const staff = relationRow(row.staff as Record<string, unknown> | Record<string, unknown>[] | null);
  return {
    id: String(row.id),
    staffType: text(row.staff_type, "Healthcare Staff"),
    numberOfStaff: numberValue(row.number_of_staff, 1),
    status: text(row.status, "Pending"),
    paymentStatus: text(row.payment_status, "pending"),
    scheduledDate: text(row.scheduled_date),
    scheduledTime: text(row.scheduled_time),
    durationHours: numberValue(row.duration_hours, 0),
    fullAddress: text(row.full_address),
    city: text(row.city, "Location not specified"),
    patientCondition: text(row.patient_condition, "General care requirement"),
    specialInstructions: text(row.special_instructions),
    totalAmount: numberValue(row.total_amount, 0),
    staffName: staff ? text((staff as Record<string, unknown>).name) || null : null,
    staffPhone: staff ? text((staff as Record<string, unknown>).phone) || null : null,
    createdAt: text(row.created_at),
  };
}

const STAFFING_BOOKING_SELECT =
  "id,staff_type,number_of_staff,status,payment_status,scheduled_date,scheduled_time,duration_hours,full_address,city,patient_condition,special_instructions,total_amount,created_at,staff:users!staffing_bookings_staff_id_fkey(name,phone)";

// Staffing requests are request-first: the admin dispatch team assigns a
// provider and confirms pricing after submission (see StaffingDispatchScreen
// in the admin panel). customer_transactions.service_type has no
// "staffing_booking" entry and admin's own read path defaults payment_status
// to "pending" — so this intentionally does NOT mark the booking "paid" the
// way the mobile app's created-with-zero-amount request does.
export async function createStaffingBooking(params: {
  patientId: string;
  staffType: string;
  numberOfStaff: number;
  bookingItems: Array<{ staffType: string; quantity: number }>;
  patientCondition: string;
  fullAddress: string;
  city: string;
  scheduledDate: string;
  scheduledTime: string;
  durationHours: number;
  specialInstructions: string;
}) {
  const supabase = client();
  const { data: booking, error } = await supabase
    .from("staffing_bookings")
    .insert({
      patient_id: params.patientId,
      staff_id: null,
      staff_type: params.staffType,
      number_of_staff: Math.max(1, params.numberOfStaff),
      patient_condition: params.patientCondition.trim() || null,
      full_address: params.fullAddress.trim(),
      city: params.city.trim() || null,
      scheduled_date: params.scheduledDate,
      scheduled_time: params.scheduledTime,
      duration_hours: Math.max(1, params.durationHours),
      special_instructions: params.specialInstructions.trim() || null,
      estimated_price: 0,
      commission_amount: 0,
      total_amount: 0,
      payment_method: null,
      payment_status: "pending",
      status: "Pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const items = params.bookingItems
    .filter((item) => item.staffType && item.quantity > 0)
    .map((item) => ({
      booking_id: booking.id,
      staff_type: item.staffType,
      quantity: Math.max(1, Math.round(item.quantity)),
    }));

  if (items.length) {
    const { error: itemsError } = await supabase.from("staffing_booking_items").insert(items);
    if (itemsError) throw new Error(itemsError.message);
  }

  return booking as { id: string };
}

export async function fetchPatientStaffingBookings(patientId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("staffing_bookings")
    .select(STAFFING_BOOKING_SELECT)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapStaffingBookingRow(row as Record<string, unknown>)) satisfies StaffingBookingSummary[];
}

export function subscribeToPatientStaffingBookings(patientId: string, onChange: () => void) {
  const supabase = client();
  const channel = supabase
    .channel(`staffing-bookings-${patientId}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "staffing_bookings", filter: `patient_id=eq.${patientId}` },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
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
    hospital: text(doctor?.hospital, "Hospital not specified"),
    };
  }) satisfies AppointmentSummary[];
}

export async function createDoctorAppointment(params: {
  doctorId: string;
  patientId: string;
  date: string;
  time: string;
  consultationType: string;
  fee: number;
}) {
  const supabase = client();

  const { data: activeAppointments, error: activeError } = await supabase
    .from("doctor_appointments")
    .select("id")
    .eq("patient_id", params.patientId)
    .not("status", "in", '("completed","cancelled")')
    .limit(1);

  if (activeError) throw new Error(activeError.message);
  if (activeAppointments?.length) {
    throw new Error("You already have an active doctor appointment. Please complete or cancel it before booking another.");
  }

  const { data, error } = await supabase
    .from("doctor_appointments")
    .insert({
      doctor_id: params.doctorId,
      patient_id: params.patientId,
      appointment_date: params.date,
      appointment_time: params.time,
      consultation_type: params.consultationType,
      status: "confirmed",
      fee: params.fee,
      payment_status: "paid",
      chief_complaint: "Booked from customer web",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" || error.message.includes("doctor_appointments_one_active_per_patient_idx")) {
      throw new Error("You already have an active doctor appointment. Please complete or cancel it before booking another.");
    }
    throw new Error(error.message);
  }
  return data as { id: string };
}

export type PharmacyOrderSummary = {
  id: string;
  status: string;
  paymentMethod: string;
  total: number;
  itemCount: number;
  pharmacyName: string;
  createdAt: string;
};

export async function createPharmacyOrder(params: {
  patientId: string;
  pharmacyId: string | null;
  paymentMethod: "upi" | "card" | "cod";
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number }>;
}) {
  const supabase = client();

  const { data: order, error } = await supabase
    .from("pharmacy_orders")
    .insert({
      patient_id: params.patientId,
      pharmacy_id: params.pharmacyId,
      status: "placed",
      payment_method: params.paymentMethod,
      payment_status: params.paymentMethod === "cod" ? "pending" : "paid",
      subtotal: params.subtotal,
      delivery_fee: params.deliveryFee,
      total: params.total,
      delivery_address: params.deliveryAddress,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const orderItems = params.items.map((line) => ({
    order_id: order.id,
    product_id: line.productId,
    product_name: line.name,
    sku: line.productId,
    quantity: line.quantity,
    unit_price: line.price,
    line_total: line.price * line.quantity,
  }));

  const { error: itemError } = await supabase.from("pharmacy_order_items").insert(orderItems);
  if (itemError) throw new Error(itemError.message);

  return order as { id: string };
}

export async function fetchPatientPharmacyOrders(patientId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("pharmacy_orders")
    .select("id,status,payment_method,total,created_at,pharmacy:users!pharmacy_orders_pharmacy_id_fkey(name),items:pharmacy_order_items(id)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => {
    const pharmacy = relationRow(row.pharmacy);
    return {
      id: row.id,
      status: text(row.status, "placed"),
      paymentMethod: text(row.payment_method, "upi"),
      total: numberValue(row.total, 0),
      itemCount: Array.isArray(row.items) ? row.items.length : 0,
      pharmacyName: text(pharmacy?.name, "Saiman Pharmacy"),
      createdAt: text(row.created_at),
    };
  }) satisfies PharmacyOrderSummary[];
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

export const INSTANT_CALL_TERMINAL_STATUSES = ["completed", "cancelled", "rejected", "no_doctor_available"];

const INSTANT_CALL_SELECT =
  "id,specialty,call_reason,status,status_message,preferred_language,doctor_id,created_at,doctor:users!instant_call_requests_doctor_id_fkey(name)";

function mapInstantCallRow(row: Record<string, unknown>): InstantCallSummary {
  const doctor = relationRow(row.doctor as Record<string, unknown> | Record<string, unknown>[] | null);
  return {
    id: String(row.id),
    specialty: text(row.specialty),
    callReason: text(row.call_reason),
    status: text(row.status),
    statusMessage: (row.status_message as string | null) ?? null,
    preferredLanguage: (row.preferred_language as string | null) ?? null,
    doctorId: (row.doctor_id as string | null) ?? null,
    doctorName: doctor ? text((doctor as Record<string, unknown>).name) || null : null,
    createdAt: text(row.created_at),
  };
}

export async function fetchActiveInstantCallRequest(userId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("instant_call_requests")
    .select(INSTANT_CALL_SELECT)
    .eq("patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  if (INSTANT_CALL_TERMINAL_STATUSES.includes(text(row.status))) return null;

  return mapInstantCallRow(row as Record<string, unknown>);
}

export async function fetchInstantCallHistory(userId: string, limit = 6) {
  const supabase = client();
  const { data, error } = await supabase
    .from("instant_call_requests")
    .select(INSTANT_CALL_SELECT)
    .eq("patient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapInstantCallRow(row as Record<string, unknown>)) satisfies InstantCallSummary[];
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

export async function markInstantCallConnecting(requestId: string, mode: "voice" | "video" = "voice") {
  const supabase = client();
  const { error } = await supabase.rpc("mark_instant_call_connecting", { p_request_id: requestId, p_mode: mode });
  if (error) throw new Error(error.message);
}

export async function markInstantCallInProgress(requestId: string) {
  const supabase = client();
  const { error } = await supabase.rpc("mark_instant_call_in_progress", { p_request_id: requestId });
  if (error) throw new Error(error.message);
}

export async function cancelInstantCallRequest(requestId: string, reason?: string) {
  const supabase = client();
  const { error } = await supabase.rpc("cancel_instant_call", { p_request_id: requestId, p_reason: reason?.trim() || null });
  if (error) throw new Error(error.message);
}

export function subscribeToInstantCallRequest(patientId: string, onChange: () => void) {
  const supabase = client();
  const channel = supabase
    .channel(`instant-call-request-${patientId}-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "instant_call_requests", filter: `patient_id=eq.${patientId}` },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Shared status display helper — never show a raw snake_case/enum value to a
// customer. Title-cases and de-underscores; specific tables' real values
// ("sample_collected", "return_requested", etc.) all read cleanly through this.
// ---------------------------------------------------------------------------
export function formatBookingStatus(status: string) {
  const normalized = String(status || "").trim();
  if (!normalized) return "Pending";
  return normalized
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Lab test bookings
// ---------------------------------------------------------------------------
export type LabBookingSummary = {
  id: string;
  labName: string;
  status: string;
  paymentStatus: string;
  homeCollection: boolean;
  reportTime: string;
  total: number;
  createdAt: string;
};

export async function fetchPatientLabBookings(patientId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("lab_test_bookings")
    .select("id,lab_name,status,payment_status,home_collection,report_time,total,created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    labName: text(row.lab_name, "Approved Lab"),
    status: text(row.status, "placed"),
    paymentStatus: text(row.payment_status, "pending"),
    homeCollection: Boolean(row.home_collection),
    reportTime: text(row.report_time, "24-48 hrs"),
    total: numberValue(row.total, 0),
    createdAt: text(row.created_at),
  })) satisfies LabBookingSummary[];
}

// ---------------------------------------------------------------------------
// Hospital & CT/MRI provider-service bookings (shared shape)
// ---------------------------------------------------------------------------
export type ProviderServiceBookingSummary = {
  id: string;
  serviceName: string;
  status: string;
  paymentStatus: string;
  appointmentDate: string;
  appointmentTime: string;
  amount: number;
  createdAt: string;
};

export async function fetchPatientProviderServiceBookings(kind: "hospital" | "ctmri", patientId: string) {
  const table = kind === "hospital" ? "hospital_service_bookings" : "ctmri_service_bookings";
  const supabase = client();
  const { data, error } = await supabase
    .from(table)
    .select("id,service_name,status,payment_status,appointment_date,appointment_time,amount,created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    serviceName: text(row.service_name, kind === "hospital" ? "Hospital Consultation" : "Imaging Scan"),
    status: text(row.status, "requested"),
    paymentStatus: text(row.payment_status, "pending"),
    appointmentDate: text(row.appointment_date),
    appointmentTime: text(row.appointment_time),
    amount: numberValue(row.amount, 0),
    createdAt: text(row.created_at),
  })) satisfies ProviderServiceBookingSummary[];
}

// ---------------------------------------------------------------------------
// Rental equipment orders
// ---------------------------------------------------------------------------
export type RentalOrderSummary = {
  id: string;
  equipmentName: string;
  providerName: string;
  plan: string;
  rentalDays: number;
  status: string;
  paymentStatus: string;
  total: number;
  deliveryAddress: string;
  createdAt: string;
};

export async function fetchPatientRentalOrders(patientId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from("rental_orders")
    .select("id,equipment_name,provider_name,plan,rental_days,status,payment_status,total,delivery_address,created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    id: row.id,
    equipmentName: text(row.equipment_name, "Rental Equipment"),
    providerName: text(row.provider_name, "Verified Provider"),
    plan: text(row.plan, "daily"),
    rentalDays: numberValue(row.rental_days, 1),
    status: text(row.status, "placed"),
    paymentStatus: text(row.payment_status, "pending"),
    total: numberValue(row.total, 0),
    deliveryAddress: text(row.delivery_address),
    createdAt: text(row.created_at),
  })) satisfies RentalOrderSummary[];
}

export async function requestRentalReturn(orderId: string, patientId: string, returnMethod: "pickup" | "self") {
  const supabase = client();
  const { error } = await supabase
    .from("rental_orders")
    .update({ status: "return_requested", return_method: returnMethod, return_requested_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("patient_id", patientId);

  if (error) throw new Error(error.message);
}

export async function cancelRentalOrder(orderId: string, patientId: string) {
  const supabase = client();
  const { error } = await supabase.from("rental_orders").update({ status: "cancelled" }).eq("id", orderId).eq("patient_id", patientId);
  if (error) throw new Error(error.message);
}
