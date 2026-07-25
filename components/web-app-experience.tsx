"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { CustomerShellAuthActions, useCustomerUser } from "@/components/customer-live";
import { primaryNav, recordsSummary, subscriptionPlans, supportTopics } from "@/lib/customer-web-data";
import {
  createSupportTicket,
  fetchActiveInstantCallRequest,
  fetchApprovedCtmriServices,
  fetchApprovedDoctors,
  fetchApprovedHospitalServices,
  fetchApprovedLabTests,
  fetchApprovedPharmacyProducts,
  fetchApprovedRentalEquipment,
  fetchApprovedStaffingProviders,
  fetchCustomerProfile,
  fetchPatientAppointments,
  fetchSupportTickets,
  loginCustomer,
  requestInstantCall,
  signupCustomer,
  type AppointmentSummary,
  type CtmriServiceSummary,
  type CustomerProfileSummary,
  type DoctorSummary,
  type HospitalServiceSummary,
  type LabTestSummary,
  type PharmacyProductSummary,
  type RentalEquipmentSummary,
  type StaffingProviderSummary,
  type SupportTicketSummary,
} from "@/lib/customer-web-live";
import {
  addLocalBooking,
  addLocalOrder,
  addProductToCart,
  clearCart,
  decrementProduct,
  DEMO_PHARMACY_PRODUCTS,
  getCartLines,
  getCartSnapshot,
  getLocalBookings,
  getLocalOrders,
  mobileStoreKeys,
  registerPharmacyProducts,
  removeProduct,
  subscribeStore,
  type DemoPharmacyProduct,
} from "@/lib/mobile-web-state";
import { beginWebPayment, clearPendingPayment, getCallServerBase, getPendingPayment, verifyWebPayment } from "@/lib/web-payments";

function formatMoney(value: number) {
  return `Rs ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeLabel(date: string, time: string) {
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`.trim();
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY_CART_SNAPSHOT = {
  lines: [] as Array<{ product: DemoPharmacyProduct; quantity: number }>,
  itemCount: 0,
  mrp: 0,
  total: 0,
  saved: 0,
};

const EMPTY_BOOKINGS: ReturnType<typeof getLocalBookings> = [];
const EMPTY_ORDERS: ReturnType<typeof getLocalOrders> = [];

let lastCartKey = "";
let lastCartValue = EMPTY_CART_SNAPSHOT;
let lastBookingsKey = "";
let lastBookingsValue = EMPTY_BOOKINGS;
let lastOrdersKey = "";
let lastOrdersValue = EMPTY_ORDERS;

function getStableCartSnapshot() {
  const key = JSON.stringify(getCartLines());
  if (key === lastCartKey) return lastCartValue;
  lastCartKey = key;
  lastCartValue = getCartSnapshot();
  return lastCartValue;
}

function getStableBookingsSnapshot() {
  const next = getLocalBookings();
  const key = JSON.stringify(next);
  if (key === lastBookingsKey) return lastBookingsValue;
  lastBookingsKey = key;
  lastBookingsValue = next;
  return lastBookingsValue;
}

function getStableOrdersSnapshot() {
  const next = getLocalOrders();
  const key = JSON.stringify(next);
  if (key === lastOrdersKey) return lastOrdersValue;
  lastOrdersKey = key;
  lastOrdersValue = next;
  return lastOrdersValue;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "DR";
}

const tonePalette = [
  "linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)",
  "linear-gradient(180deg, #effcf6 0%, #ffffff 100%)",
  "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)",
  "linear-gradient(180deg, #fdf2f8 0%, #ffffff 100%)",
  "linear-gradient(180deg, #ecfeff 0%, #ffffff 100%)",
];

function toneFromSeed(seed: string) {
  const key = seed.trim().toLowerCase();
  const total = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tonePalette[total % tonePalette.length];
}

function MarketplaceImage({
  src,
  fallbackSrc,
  alt,
  label,
  style,
  textStyle,
  sizes = "(max-width: 1024px) 100vw, 33vw",
  fit = "cover",
}: {
  src?: string | null;
  fallbackSrc?: string;
  alt: string;
  label: string;
  style: React.CSSProperties;
  textStyle?: React.CSSProperties;
  sizes?: string;
  fit?: "cover" | "contain";
}) {
  const frameStyle = {
    ...style,
    position: "relative" as const,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  };

  const imageSrc = src || fallbackSrc;

  if (imageSrc) {
    return (
      <div style={frameStyle}>
        <Image src={imageSrc} alt={alt} fill sizes={sizes} style={{ objectFit: fit }} />
      </div>
    );
  }

  return (
    <div style={{ ...frameStyle, background: toneFromSeed(label) }}>
      <span style={textStyle}>{label}</span>
    </div>
  );
}

function DoctorImage({
  doctor,
  style,
  textStyle,
}: {
  doctor: Pick<DoctorSummary, "name" | "avatarUrl">;
  style: React.CSSProperties;
  textStyle?: React.CSSProperties;
}) {
  return (
    <MarketplaceImage
      src={doctor.avatarUrl}
      alt={doctor.name}
      label={getInitials(doctor.name)}
      style={style}
      textStyle={textStyle}
      sizes="(max-width: 1024px) 50vw, 180px"
    />
  );
}

function buildAuthRedirect(nextPath: string) {
  const safeNext = nextPath || "/";
  return `/auth/signup?next=${encodeURIComponent(safeNext)}`;
}

function useAuthActionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, state, configured } = useCustomerUser();

  function requireAuth(targetPath?: string) {
    if (!configured) {
      alert("Customer login is not available until Supabase env is configured.");
      return null;
    }

    if (state.loading) {
      return null;
    }

    if (!user) {
      router.push(buildAuthRedirect(targetPath || pathname || "/"));
      return null;
    }

    return user;
  }

  return {
    user,
    state,
    configured,
    requireAuth,
  };
}

function useCart() {
  return useSyncExternalStore(
    (callback) => subscribeStore(mobileStoreKeys.cart, callback),
    () => getStableCartSnapshot(),
    () => EMPTY_CART_SNAPSHOT,
  );
}

function useBookings() {
  return useSyncExternalStore(
    (callback) => subscribeStore(mobileStoreKeys.bookings, callback),
    () => getStableBookingsSnapshot(),
    () => EMPTY_BOOKINGS,
  );
}

function useOrders() {
  return useSyncExternalStore(
    (callback) => subscribeStore(mobileStoreKeys.orders, callback),
    () => getStableOrdersSnapshot(),
    () => EMPTY_ORDERS,
  );
}

function WebAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, state } = useCustomerUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nextPath = searchParams.get("next") || "/";

  useEffect(() => {
    if (state.loading || !user) return;
    router.replace(nextPath);
  }, [nextPath, router, state.loading, user]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await loginCustomer(email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error("Password confirmation does not match.");
        }
        await signupCustomer({ name, phone, email, password });
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to continue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={styles.authForm}>
      {mode === "signup" ? (
        <>
          <label style={styles.fieldLabel}>Full name</label>
          <input style={styles.fieldInput} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required />
          <label style={styles.fieldLabel}>Phone number</label>
          <input style={styles.fieldInput} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" required />
        </>
      ) : null}
      <label style={styles.fieldLabel}>Email address</label>
      <input style={styles.fieldInput} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
      <label style={styles.fieldLabel}>Password</label>
      <input style={styles.fieldInput} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
      {mode === "signup" ? (
        <>
          <label style={styles.fieldLabel}>Confirm password</label>
          <input
            style={styles.fieldInput}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </>
      ) : (
        <div style={styles.inlineLinkRow}>
          <span />
          <button type="button" style={styles.textButton}>Forgot password?</button>
        </div>
      )}
      {error ? <div style={styles.errorNote}>{error}</div> : null}
      <button type="submit" style={styles.primaryAction} disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Sign In as Patient" : "Create Account"}
      </button>
      <div style={styles.authDivider}>
        <span style={styles.authDividerLine} />
        <span>or</span>
        <span style={styles.authDividerLine} />
      </div>
      <div style={styles.authQuickRow}>
        <button type="button" style={styles.secondaryAction}>Google</button>
        <button type="button" style={styles.secondaryAction}>Mobile OTP</button>
      </div>
      <button type="button" style={styles.linkAction}>Continue email verification</button>
      <Link href={mode === "login" ? "/auth/signup" : "/auth/login"} style={styles.authSwitch}>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
      </Link>
    </form>
  );
}

function AuthPageTemplate({
  title,
  subtitle,
  cardTitle,
  cardSubtitle,
  mode,
}: {
  title: string;
  subtitle: string;
  cardTitle: string;
  cardSubtitle: string;
  mode: "login" | "signup";
}) {
  return (
    <div style={styles.authPage}>
      <div style={styles.authGrid}>
        <section style={styles.authVisual}>
          <div style={styles.authBadge}>Austy Healthcare</div>
          <h1 style={styles.authHeadline}>{title}</h1>
          <p style={styles.authCopy}>{subtitle}</p>
          <div style={styles.authHighlightGrid}>
            {[
              "Book doctor consults with approved specialists",
              "Order medicines, track pharmacy checkout and payments",
              "Manage appointments, instant calls, and care history in one place",
            ].map((item) => (
              <div key={item} style={styles.authHighlightCard}>
                <span style={styles.authHighlightIcon}>✚</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.authPanel}>
          <div style={styles.authPanelBorder} />
          <h2 style={styles.authPanelTitle}>{cardTitle}</h2>
          <p style={styles.authPanelCopy}>{cardSubtitle}</p>
          <Suspense fallback={<div style={styles.noticeCard}>Loading form...</div>}>
            <WebAuthForm mode={mode} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

export function WebLoginScreen() {
  return (
    <AuthPageTemplate
      title="Sign in to the same customer journey shown in the app."
      subtitle="Use your Saiman customer account to access doctor booking, instant call, pharmacy checkout, appointments, and profile data from the web."
      cardTitle="Welcome back"
      cardSubtitle="Continue to your health dashboard"
      mode="login"
    />
  );
}

export function WebSignupScreen() {
  return (
    <AuthPageTemplate
      title="Create one healthcare account for all customer services."
      subtitle="Set up your patient profile once, then use the same web dashboard for doctors, pharmacy, records, instant calls, and future payments."
      cardTitle="Create your account"
      cardSubtitle="Set up your patient profile to continue"
      mode="signup"
    />
  );
}

function DashboardFrame({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  accent?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useCustomerUser();

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <Link href="/" style={styles.brandWrap}>
          <span style={styles.brandMark}>✚</span>
          <div>
            <strong style={styles.brandTitle}>Austy Healthcare</strong>
            <small style={styles.brandSub}>Customer web app</small>
          </div>
        </Link>

        <nav style={styles.navList}>
          {primaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}>
                <span style={styles.navItemShort}>{item.short}</span>
                <small style={styles.navItemLabel}>{item.label}</small>
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarPromo}>
          <span style={styles.sidebarPromoTag}>LIVE SUPPORT</span>
          <h3 style={styles.sidebarPromoTitle}>Need urgent medical guidance?</h3>
          <p style={styles.sidebarPromoCopy}>Start the same instant-call flow from the app, now optimized for web.</p>
          <Link href="/instant-call" style={styles.sidebarPromoButton}>Start Instant Call</Link>
        </div>
      </aside>

      <main style={styles.mainArea}>
        <header style={styles.topbar}>
          <div>
            <div style={styles.pageEyebrow}>Saiman Customer Experience</div>
            <h1 style={styles.pageTitle}>{title}</h1>
            <p style={styles.pageSubtitle}>{subtitle}</p>
          </div>
          <div style={styles.topbarRight}>
            {accent}
            <div style={styles.topbarAccount}>
              <div style={styles.accountMeta}>
                <strong>{user?.name || "Guest Customer"}</strong>
                <span>{user?.email || "Browse first, sign up when you book"}</span>
              </div>
              <CustomerShellAuthActions />
            </div>
          </div>
        </header>
        <section style={styles.mainContent}>{children}</section>
      </main>
    </div>
  );
}

export function WebHomeScreen() {
  const { user } = useCustomerUser();
  const cart = useCart();

  const services = [
    { title: "Doctor Consult", detail: "Find specialists, compare fees, and book consultations.", href: "/doctors" },
    { title: "Pharmacy", detail: "Browse medicines and place a Razorpay checkout order.", href: "/pharmacy" },
    { title: "Lab Tests", detail: "Search tests and compare available labs.", href: "/lab-tests" },
    { title: "CT / MRI", detail: "Compare imaging services with approved centers.", href: "/ct-mri" },
    { title: "Ambulance", detail: "Request emergency pickup and support instantly.", href: "/ambulance" },
    { title: "Rental Equipment", detail: "Browse patient-care equipment available for rent.", href: "/rental-equipment" },
    { title: "Hospitals & Surgeries", detail: "Discover approved hospitals and surgery services.", href: "/hospitals" },
    { title: "Health Card", detail: "Review membership-style plans and document readiness.", href: "/health-card" },
    { title: "Care Staff", detail: "Find nurses, caregivers, and support professionals.", href: "/care-staff" },
  ];

  return (
    <DashboardFrame
      title={`Good morning, ${user?.name || "Customer"}!`}
      subtitle="This web dashboard follows the same customer flow as the app: discover services, book doctors, pay online, and manage orders from one place."
      accent={cart.itemCount ? <Link href="/pharmacy/cart" style={styles.headerPill}>Cart · {cart.itemCount}</Link> : undefined}
    >
      <div style={styles.heroGrid}>
        <section style={styles.heroPanel}>
          <div style={styles.heroTag}>Limited Time</div>
          <h2 style={styles.heroHeading}>20% off on lab tests and one place for all healthcare services.</h2>
          <p style={styles.heroCopy}>Book trusted doctors, medicines, tests, ambulance help, hospitals, and instant calls from a web experience modeled after the customer app.</p>
          <div style={styles.heroActionRow}>
            <Link href="/doctors" style={styles.primaryActionLink}>Book Doctor</Link>
            <Link href="/pharmacy" style={styles.secondaryActionLink}>Browse Medicines</Link>
          </div>
        </section>

        <section style={styles.sideFeatureStack}>
          <div style={styles.searchModule}>
            <strong>Search the same care categories shown in the app</strong>
            <span>Doctors, tests, medicines, hospitals, and support</span>
          </div>
          <div style={styles.tipCard}>
            <span style={styles.tipTag}>Lab Tests</span>
            <strong>How to prepare for a lab test</strong>
            <p>Simple web-friendly content blocks can match the app sections while giving users more room to read and act.</p>
          </div>
        </section>
      </div>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Our Services</h2>
          <Link href="/support" style={styles.linkActionInline}>View all</Link>
        </div>
        <div style={styles.serviceGrid}>
          {services.map((service) => (
            <Link key={service.title} href={service.href} style={styles.serviceCard}>
              <div style={styles.serviceIcon}>✚</div>
              <strong>{service.title}</strong>
              <p>{service.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <div style={styles.dashboardSplit}>
        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Health Blogs</h2>
          </div>
          {[
            {
              tag: "Doctor Consult",
              title: "When should you consult a doctor online?",
              detail: "Video consults are useful for follow-ups, common symptoms, and quick medical guidance.",
              image: "/blog-doctor-consult.svg",
            },
            {
              tag: "Pharmacy",
              title: "Medicine delivery safety tips",
              detail: "Check dosage, expiry date, and packaging when your medicines arrive.",
              image: "/blog-pharmacy-safety.svg",
            },
          ].map((item) => (
            <div key={item.title} style={styles.blogRow}>
              <div style={styles.blogVisual}>
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="160px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div>
                <span style={styles.blogTag}>{item.tag}</span>
                <h3 style={styles.blogTitle}>{item.title}</h3>
                <p style={styles.blogDetail}>{item.detail}</p>
              </div>
            </div>
          ))}
        </section>

        <section style={styles.stackColumn}>
          <div style={styles.teleConsultCard}>
            <span style={styles.liveChip}>LIVE</span>
            <h3 style={styles.teleTitle}>Teleconsult</h3>
            <p style={styles.teleCopy}>Talk to a doctor anytime, anywhere from the same instant-call workflow.</p>
            <Link href="/instant-call" style={styles.primaryActionLink}>Start Call</Link>
          </div>
          <div style={styles.dualPromoGrid}>
            <Link href="/subscription-plans" style={styles.subscriptionTile}>
              <span style={styles.subscriptionTag}>Popular</span>
              <strong>Subscription Plan</strong>
              <p>Save up to 20%</p>
              <h3>From ₹799</h3>
            </Link>
            <Link href="/ambulance" style={styles.emergencyTile}>
              <strong>Emergency Help</strong>
              <p>Available 24×7</p>
              <h3>0124 456 7890</h3>
            </Link>
          </div>
        </section>
      </div>
    </DashboardFrame>
  );
}

export function WebDoctorsScreen() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");

  useEffect(() => {
    fetchApprovedDoctors()
      .then((items) => setDoctors(items))
      .finally(() => setLoading(false));
  }, []);

  const specialties = ["All", ...Array.from(new Set(doctors.map((doctor) => doctor.specialty)))];
  const filtered = doctors.filter((doctor) => {
    const matchesSpecialty = specialty === "All" || doctor.specialty === specialty;
    const haystack = `${doctor.name} ${doctor.specialty} ${doctor.hospital} ${doctor.city}`.toLowerCase();
    return matchesSpecialty && haystack.includes(query.toLowerCase());
  });

  return (
    <DashboardFrame title="Doctor Consultation" subtitle="Find and consult top doctors with the same discover-to-book flow shown in the mobile app.">
      <section style={styles.heroWideCard}>
        <div>
          <span style={styles.bluePill}>Verified Doctors</span>
          <h2 style={styles.heroHeadingAlt}>Consult trusted specialists with clear pricing.</h2>
          <div style={styles.heroMetricRow}>
            <span style={styles.metricBadge}>120+ doctors</span>
            <span style={styles.metricBadge}>Same-day slots</span>
            <span style={styles.metricBadge}>Secure care</span>
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.filtersGrid}>
          <input
            style={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search doctors, specialties, hospital..."
          />
          <div style={styles.chipRow}>
            {specialties.slice(0, 8).map((item) => (
              <button key={item} style={{ ...styles.filterChip, ...(specialty === item ? styles.filterChipActive : {}) }} onClick={() => setSpecialty(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? <div style={styles.noticeCard}>Loading doctors...</div> : null}

      <div style={styles.doctorGrid}>
        {filtered.map((doctor) => (
          <Link key={doctor.id} href={`/doctors/${doctor.id}`} style={styles.doctorCard}>
            <DoctorImage doctor={doctor} style={styles.doctorAvatarPanel} textStyle={styles.doctorAvatarFallback} />
            <div style={styles.doctorBody}>
              <div style={styles.doctorTopline}>
                <h3 style={styles.doctorName}>{doctor.name}</h3>
                <span style={styles.verifiedBadge}>Verified</span>
              </div>
              <div style={styles.doctorSpecialty}>{doctor.specialty}</div>
              <p style={styles.doctorMeta}>{doctor.hospital} · {doctor.city}</p>
              <p style={styles.doctorMeta}>{doctor.experience}+ years experience · ⭐ {doctor.rating || 4.8}</p>
              <div style={styles.doctorFooter}>
                <strong>{formatMoney(doctor.fee)}</strong>
                <span style={styles.availableLabel}>Available today</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebDoctorDetailScreen({ doctorId }: { doctorId: string }) {
  const { requireAuth } = useAuthActionGuard();
  const [doctor, setDoctor] = useState<DoctorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"single" | "monthly" | "yearly">("single");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovedDoctors()
      .then((items) => setDoctor(items.find((item) => item.id === doctorId) || null))
      .finally(() => setLoading(false));
  }, [doctorId]);

  async function handleContinue() {
    if (!doctor) return;
    const user = requireAuth(`/doctors/${doctor.id}`);
    if (!user) return;
    if (!getCallServerBase()) {
      alert("NEXT_PUBLIC_CALL_SERVER_URL is missing for Razorpay checkout.");
      return;
    }

    const fee = selectedPlan === "monthly" ? doctor.fee * 3 : selectedPlan === "yearly" ? doctor.fee * 10 : doctor.fee;
    setSubmitting(true);

    try {
      await beginWebPayment({
        kind: "doctor_booking",
        returnTo: "/appointments",
        redirectUri: `${window.location.origin}/payment-callback`,
        appointment: {
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorSpecialty: doctor.specialty,
          hospital: doctor.hospital,
          fee,
          consultationType: "clinic",
          appointmentDate: "2026-07-26",
          appointmentTime: "05:00 AM",
        },
        payment: {
          serviceType: "doctor_consultation",
          serviceLabel: doctor.name,
          description: `Consultation with ${doctor.name}`,
          amount: fee,
          paymentMethod: "upi",
          providerId: doctor.id,
          providerName: doctor.name,
          customer: {
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          metadata: {
            doctorId: doctor.id,
            selectedPlan,
          },
        },
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  return (
    <DashboardFrame title="Doctor Profile" subtitle="Review doctor details, choose a plan, and continue to the same Razorpay-backed consultation flow.">
      {loading ? <div style={styles.noticeCard}>Loading doctor profile...</div> : null}
      {doctor ? (
        <>
          <section style={styles.detailHeroGrid}>
            <div style={styles.profileCard}>
              <DoctorImage doctor={doctor} style={styles.profileImage} textStyle={styles.profileImageFallback} />
              <div style={styles.profileInfo}>
                <div style={styles.doctorTopline}>
                  <h2 style={styles.profileName}>{doctor.name}</h2>
                  <span style={styles.verifiedBadge}>Verified</span>
                </div>
                <div style={styles.doctorSpecialty}>{doctor.specialty}</div>
                <p style={styles.doctorMeta}>Verified medical practitioner</p>
                <div style={styles.profileStats}>
                  <span style={styles.metricBadge}>⭐ 4.8</span>
                  <span style={styles.metricBadge}>{doctor.experience}+ yrs</span>
                  <span style={styles.metricBadge}>{doctor.hospital}</span>
                </div>
              </div>
              <div style={styles.priceAside}>
                <strong>{formatMoney(doctor.fee)}</strong>
                <span>Starts from</span>
              </div>
            </div>
            <div style={styles.aboutCard}>
              <h3 style={styles.sectionTitle}>About Doctor</h3>
              <p style={styles.blogDetail}>
                {doctor.name} is verified on Austy Healthcare and available for appointments through the same customer platform used by the app.
              </p>
              <div style={styles.infoStatGrid}>
                <div style={styles.infoStatCard}>
                  <strong>Next Available</strong>
                  <span>Today · Evening 05:00 AM - 06:00 AM</span>
                </div>
                <div style={styles.infoStatCard}>
                  <strong>Languages</strong>
                  <span>English, Hindi</span>
                </div>
              </div>
            </div>
          </section>

          <section style={styles.sectionBlock}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Consultation Plans</h2>
            </div>
            <div style={styles.planGrid}>
              {[
                { id: "single", label: "Single Consultation", sub: "One-time", amount: doctor.fee },
                { id: "monthly", label: "Monthly Plan", sub: "4 consultations", amount: doctor.fee * 3 },
                { id: "yearly", label: "Yearly Plan", sub: "Best value", amount: doctor.fee * 10 },
              ].map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id as "single" | "monthly" | "yearly")}
                  style={{ ...styles.planChoice, ...(selectedPlan === plan.id ? styles.planChoiceActive : {}) }}
                >
                  <div>
                    <strong>{plan.label}</strong>
                    <span>{plan.sub}</span>
                  </div>
                  <div style={styles.planAmount}>{formatMoney(plan.amount)}</div>
                </button>
              ))}
            </div>
          </section>

          <section style={styles.checkoutBar}>
            <div>
              <strong style={styles.checkoutTitle}>
                {selectedPlan === "single" ? "Single Consultation" : selectedPlan === "monthly" ? "Monthly Plan" : "Yearly Plan"}
              </strong>
              <span style={styles.checkoutMeta}>{formatDateTimeLabel("2026-07-26", "05:00 AM")}</span>
            </div>
            <button onClick={handleContinue} style={styles.primaryAction} disabled={submitting}>
              {submitting
                ? "Starting..."
                : `Continue · ${formatMoney(
                    selectedPlan === "monthly" ? doctor.fee * 3 : selectedPlan === "yearly" ? doctor.fee * 10 : doctor.fee,
                  )}`}
            </button>
          </section>
        </>
      ) : null}
    </DashboardFrame>
  );
}

export function WebInstantCallScreen() {
  const { user, requireAuth } = useAuthActionGuard();
  const [specialty, setSpecialty] = useState("General Physician");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [request, setRequest] = useState<{ status: string; specialty: string; callReason: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchActiveInstantCallRequest(user.id).then((value) => {
      setRequest(value ? { status: value.status, specialty: value.specialty, callReason: value.callReason } : null);
    });
  }, [user]);

  async function submit() {
    const authUser = requireAuth("/instant-call");
    if (!authUser) return;
    setSubmitting(true);
    try {
      await requestInstantCall({
        specialty,
        callReason: reason,
        notes,
        preferredLanguage: "English",
      });
      if (authUser) {
        const next = await fetchActiveInstantCallRequest(authUser.id);
        if (next) {
          setRequest({ status: next.status, specialty: next.specialty, callReason: next.callReason });
        }
      }
      setReason("");
      setNotes("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to request instant call.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardFrame title="Instant Call" subtitle="Request a quick voice consultation with an online doctor using the same specialty-led flow as the app.">
      <div style={styles.twoColumnGrid}>
        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Relevant specialty</h2>
            <span style={styles.onlineMarker}>5 online</span>
          </div>
          <div style={styles.specialtyGrid}>
            {["Cardiologist", "Dermatologist", "Endocrinologist", "ENT Specialist", "General Physician", "Gynaecologist", "Neurologist", "Orthopaedic"].map((item) => (
              <button
                key={item}
                onClick={() => setSpecialty(item)}
                style={{ ...styles.specialtyCard, ...(specialty === item ? styles.specialtyCardActive : {}) }}
              >
                <span style={styles.specialtyIcon}>✚</span>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </section>

        <section style={styles.sectionBlock}>
          <h2 style={styles.sectionTitle}>Request details</h2>
          <label style={styles.fieldLabel}>Call purpose / reason</label>
          <input style={styles.fieldInput} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe the purpose of the call" />
          <label style={styles.fieldLabel}>Symptoms or notes</label>
          <textarea style={styles.textArea} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Symptoms or notes" />
          {request ? <div style={styles.noticeCard}>Current request: {request.specialty} · {request.status}</div> : null}
          <button onClick={submit} style={{ ...styles.primaryAction, marginTop: 18 }} disabled={submitting}>
            {submitting ? "Requesting..." : "Request instant call"}
          </button>
        </section>
      </div>
    </DashboardFrame>
  );
}

export function WebAppointmentsScreen() {
  const { user } = useCustomerUser();
  const [liveAppointments, setLiveAppointments] = useState<AppointmentSummary[]>([]);
  const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");
  const localBookings = useBookings();

  useEffect(() => {
    if (!user) return;
    fetchPatientAppointments(user.id).then(setLiveAppointments).catch(() => setLiveAppointments([]));
  }, [user]);

  const merged = [
    ...localBookings.map((booking) => ({
      id: booking.id,
      doctorName: booking.doctorName,
      doctorSpecialty: booking.doctorSpecialty,
      hospital: booking.hospital,
      fee: booking.fee,
      consultationType: booking.consultationType,
      appointmentDate: booking.appointmentDate,
      appointmentTime: booking.appointmentTime,
      status: booking.status,
    })),
    ...liveAppointments.map((item) => ({
      ...item,
      status: ["completed", "cancelled"].includes(item.status.toLowerCase()) ? item.status.toLowerCase() : "upcoming",
    })),
  ];

  const filtered = merged.filter((item) => item.status === tab);

  return (
    <DashboardFrame title="My Appointments" subtitle="Manage upcoming consultations and track the same booking state across web and app.">
      <section style={styles.heroWideCard}>
        <h2 style={styles.heroHeadingAlt}>Your care schedule at a glance</h2>
        <p style={styles.heroCopy}>Track visits, online consults, reports, and prescriptions from one clean timeline.</p>
      </section>

      <div style={styles.tabRow}>
        {(["upcoming", "completed", "cancelled"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} style={{ ...styles.tabButton, ...(tab === item ? styles.tabButtonActive : {}) }}>
            {item[0].toUpperCase() + item.slice(1)} ({merged.filter((entry) => entry.status === item).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No {tab[0].toUpperCase() + tab.slice(1)} Appointments</h2>
          <p style={styles.emptyCopy}>Book a consultation with a top doctor from the doctors page.</p>
          <Link href="/doctors" style={styles.primaryActionLink}>Find a Doctor</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {filtered.map((item) => (
            <div key={item.id} style={styles.appointmentCard}>
              <strong>{item.doctorName}</strong>
              <span>{item.doctorSpecialty}</span>
              <small>{item.hospital}</small>
              <p>{formatDateTimeLabel(item.appointmentDate, item.appointmentTime)}</p>
              <div style={styles.doctorFooter}>
                <span>{item.consultationType}</span>
                <strong>{formatMoney(item.fee)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardFrame>
  );
}

export function WebProfileScreen() {
  const { user } = useCustomerUser();
  const [profile, setProfile] = useState<CustomerProfileSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchCustomerProfile(user.id).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  return (
    <DashboardFrame title="My Account" subtitle="Manage your consultation account, appointments, records, and support entry points from one web view.">
      <div style={styles.profileLayout}>
        <section style={styles.profileOverview}>
          <div style={styles.profileMonogram}>P</div>
          <h2 style={styles.profileOverviewTitle}>{profile?.name || user?.name || "Your Profile"}</h2>
          <p style={styles.profileOverviewCopy}>{profile?.email || user?.email}</p>
        </section>

        <section style={styles.sectionBlock}>
          {[
            ["Appointments", "View and manage bookings", "/appointments"],
            ["Video Consults", "Start or join a call", "/instant-call"],
            ["Prescriptions", "View doctor prescriptions", "/records"],
            ["Help & Support", "FAQs and customer care", "/support"],
          ].map(([title, copy, href]) => (
            <Link key={title} href={href} style={styles.menuCard}>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
              <span>›</span>
            </Link>
          ))}
        </section>
      </div>
    </DashboardFrame>
  );
}

function mapPharmacyProduct(product: PharmacyProductSummary): DemoPharmacyProduct {
  return {
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    category: product.category,
    price: product.price,
    mrp: product.mrp ?? product.price,
    pharmacyName: product.pharmacyName,
    inStock: product.stock,
    tone: toneFromSeed(`${product.category}-${product.name}`),
    accent: "#2f59ff",
    imageUrl: product.imageUrl,
    pharmacyId: product.pharmacyId,
    city: product.city,
  };
}

function ProductCard({ product }: { product: DemoPharmacyProduct }) {
  const { requireAuth } = useAuthActionGuard();
  const cart = useCart();
  const line = cart.lines.find((item) => item.product.id === product.id);

  function handleAdd() {
    const user = requireAuth("/pharmacy");
    if (!user) return;
    addProductToCart(product);
  }

  return (
    <div style={styles.productCard}>
      <MarketplaceImage
        src={product.imageUrl}
        fallbackSrc="/service-pharmacy.svg"
        alt={product.name}
        label={getInitials(product.name)}
        style={{ ...styles.productVisual, background: product.tone }}
        textStyle={styles.visualInitials}
        fit="contain"
      />
      <strong style={styles.productTitle}>{product.name}</strong>
      <span style={styles.productMeta}>{product.subtitle} · {product.inStock} in stock</span>
      <div style={styles.priceRow}>
        <strong>{formatMoney(product.price)}</strong>
        <span>{product.pharmacyName}</span>
      </div>
      <div style={styles.stockText}>Ready to add to cart</div>
      {line ? (
        <div style={styles.quantityBox}>
          <button style={styles.quantityButton} onClick={() => decrementProduct(product.id)}>−</button>
          <span>{line.quantity}</span>
          <button style={styles.quantityButton} onClick={handleAdd}>+</button>
        </div>
      ) : (
        <button style={styles.primaryAction} onClick={handleAdd}>Add to Cart</button>
      )}
    </div>
  );
}

export function WebPharmacyScreen() {
  const [products, setProducts] = useState<DemoPharmacyProduct[]>(DEMO_PHARMACY_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const cart = useCart();

  useEffect(() => {
    let active = true;
    fetchApprovedPharmacyProducts()
      .then((items) => {
        if (!active) return;
        if (!items.length) {
          setProducts(DEMO_PHARMACY_PRODUCTS);
          return;
        }
        const mapped = items.map(mapPharmacyProduct);
        registerPharmacyProducts(mapped);
        setProducts(mapped);
      })
      .catch(() => {
        if (!active) return;
        setProducts(DEMO_PHARMACY_PRODUCTS);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = Array.from(new Set(products.map((item) => item.category)));

  return (
    <DashboardFrame
      title="Pharmacy"
      subtitle="Browse medicine categories, add products, and continue to the same cart and payment flow inspired by the app."
      accent={cart.itemCount ? <Link href="/pharmacy/cart" style={styles.headerPill}>Proceed to Checkout · {cart.itemCount}</Link> : undefined}
    >
      <section style={styles.pharmacyHero}>
        <div style={styles.deliveryBar}>
          <strong>Delivering to</strong>
          <span>D178, Industrial Area</span>
        </div>
        <div style={styles.pharmacySearch}>Search medicines, healthcare items, and categories</div>
      </section>

      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Pharmacy Banner</span>
        <h2 style={styles.heroHeadingAlt}>Order medicines from verified pharmacies</h2>
        <p style={styles.heroCopy}>The web view keeps the same banner-driven discovery and cart journey as the customer app.</p>
      </section>

      {loading ? <div style={styles.noticeCard}>Loading approved pharmacy products...</div> : null}

      {categories.map((category) => (
        <section key={category} style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>{category}</h2>
          </div>
          <div style={styles.productGrid}>
            {products.filter((item) => item.category === category).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </DashboardFrame>
  );
}

export function WebLabTestsScreen() {
  const [tests, setTests] = useState<LabTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedLabTests()
      .then(setTests)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tests.filter((test) => {
    const haystack = `${test.name} ${test.category} ${test.labName} ${test.city}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <DashboardFrame title="Lab Tests" subtitle="Search diagnostics, compare prices, and follow the same compare-and-book lab journey in a proper web layout.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Lab Tests</span>
        <h2 style={styles.heroHeadingAlt}>Trusted diagnostics with clear pricing and faster reports.</h2>
        <p style={styles.heroCopy}>Browse approved tests, review report timelines, and compare lab options from the same shared data used by the customer app.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tests, categories, or lab names..."
        />
      </section>

      {loading ? <div style={styles.noticeCard}>Loading lab tests...</div> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved lab tests available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {filtered.map((test) => (
          <div key={test.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={test.imageUrl}
              fallbackSrc="/service-lab.svg"
              alt={test.name}
              label={getInitials(test.name)}
              style={styles.tileVisual}
              textStyle={styles.visualInitials}
            />
            <span style={styles.blogTag}>{test.category}</span>
            <h3 style={styles.tileTitle}>{test.name}</h3>
            <p style={styles.tileCopy}>{test.labName}</p>
            <div style={styles.tileMetaGrid}>
              <span>{test.city}</span>
              <span>{test.reportTime}</span>
            </div>
            <div style={styles.tileFooter}>
              <strong>{formatMoney(test.price)}</strong>
              <span style={styles.availableLabel}>Book soon</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebHospitalsScreen() {
  const [services, setServices] = useState<HospitalServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedHospitalServices()
      .then(setServices)
      .finally(() => setLoading(false));
  }, []);

  const filtered = services.filter((service) => {
    const haystack = `${service.providerName} ${service.providerCity} ${service.providerAddress} ${service.serviceName} ${service.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <DashboardFrame title="Hospitals & Surgeries" subtitle="Browse approved hospitals and surgery partners with a wider web view of the same hospital discovery flow.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Hospital Discovery</span>
        <h2 style={styles.heroHeadingAlt}>Compare hospitals, specialties, and treatment access in one place.</h2>
        <p style={styles.heroCopy}>This web screen mirrors the mobile hospital browsing experience but gives more room for addresses, capacity, and next steps.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search hospitals, surgery services, city, address..."
        />
      </section>

      {loading ? <div style={styles.noticeCard}>Loading approved hospital services...</div> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved hospital services available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {filtered.map((service) => (
          <div key={service.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={service.imageUrl}
              fallbackSrc="/service-hospital.svg"
              alt={service.serviceName}
              label={getInitials(service.serviceName)}
              style={styles.tileVisual}
              textStyle={styles.visualInitials}
            />
            <div style={styles.tileMetaGrid}>
              <span style={styles.blogTag}>Austy Verified</span>
              <span>{service.totalBeds ? `${service.totalBeds} beds` : "Beds on request"}</span>
            </div>
            <h3 style={styles.tileTitle}>{service.providerName}</h3>
            <p style={styles.tileCopy}>{service.providerCity}</p>
            <strong style={styles.serviceNameText}>{service.serviceName}</strong>
            <div style={styles.tileMetaGrid}>
              <span>{service.category}</span>
              <span>{service.providerAddress}</span>
            </div>
            <div style={styles.tileFooter}>
              <div style={styles.priceStack}>
                <strong>{formatMoney(service.price)}</strong>
                {service.basePrice > service.price ? <span style={styles.strikeText}>{formatMoney(service.basePrice)}</span> : null}
              </div>
              <span style={styles.availableLabel}>Instant booking</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebCtmriScreen() {
  const [services, setServices] = useState<CtmriServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedCtmriServices()
      .then(setServices)
      .finally(() => setLoading(false));
  }, []);

  const filtered = services.filter((service) => {
    const haystack = `${service.providerName} ${service.providerCity} ${service.serviceName} ${service.category}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <DashboardFrame title="CT / MRI" subtitle="Compare imaging services, center details, and pricing from the same approved diagnostic catalog used by the app.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Imaging Services</span>
        <h2 style={styles.heroHeadingAlt}>Book scans and compare approved diagnostic centers.</h2>
        <p style={styles.heroCopy}>See live CT and MRI offerings with web-friendly cards while following the same customer discovery path as the app.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search CT, MRI, center, city..."
        />
      </section>

      {loading ? <div style={styles.noticeCard}>Loading imaging services...</div> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved CT / MRI services available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {filtered.map((service) => (
          <div key={service.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={service.imageUrl}
              fallbackSrc="/service-ctmri.svg"
              alt={service.serviceName}
              label={getInitials(service.serviceName)}
              style={styles.tileVisual}
              textStyle={styles.visualInitials}
            />
            <span style={styles.blogTag}>{service.category}</span>
            <h3 style={styles.tileTitle}>{service.serviceName}</h3>
            <p style={styles.tileCopy}>{service.providerName}</p>
            <div style={styles.tileMetaGrid}>
              <span>{service.providerCity}</span>
              <span>{service.providerAddress}</span>
            </div>
            <div style={styles.tileFooter}>
              <div style={styles.priceStack}>
                <strong>{formatMoney(service.price)}</strong>
                {service.basePrice > service.price ? <span style={styles.strikeText}>{formatMoney(service.basePrice)}</span> : null}
              </div>
              <span style={styles.availableLabel}>Same-day slots</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebRentalEquipmentScreen() {
  const [items, setItems] = useState<RentalEquipmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedRentalEquipment()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((item) => {
    const haystack = `${item.name} ${item.category} ${item.providerName} ${item.city} ${item.brand} ${item.model}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <DashboardFrame title="Rental Equipment" subtitle="Browse patient-care equipment, compare rental pricing, and review the same rental inventory service family shown in the app.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Rental Equipment</span>
        <h2 style={styles.heroHeadingAlt}>Wheelchairs, patient beds, supports, and home-care gear in one place.</h2>
        <p style={styles.heroCopy}>This web catalog keeps the same rental discovery intent while giving more room for pricing, deposit, and provider details.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search equipment, category, city..."
        />
      </section>

      {loading ? <div style={styles.noticeCard}>Loading rental equipment...</div> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved rental equipment available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {filtered.map((item) => (
          <div key={item.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={item.imageUrl}
              fallbackSrc="/service-rental.svg"
              alt={item.name}
              label={getInitials(item.name)}
              style={styles.tileVisual}
              textStyle={styles.visualInitials}
              fit="contain"
            />
            <span style={styles.blogTag}>{item.category}</span>
            <h3 style={styles.tileTitle}>{item.name}</h3>
            <p style={styles.tileCopy}>{item.providerName}</p>
            <div style={styles.tileMetaGrid}>
              <span>{item.city}</span>
              <span>{item.stock} in stock</span>
            </div>
            <div style={styles.priceStack}>
              <strong>{formatMoney(item.price)} / day</strong>
              <span>{formatMoney(item.weeklyPrice)} weekly · {formatMoney(item.monthlyPrice)} monthly</span>
            </div>
            <div style={styles.tileFooter}>
              <span>Deposit {formatMoney(item.deposit)}</span>
              <span style={styles.availableLabel}>Request rental</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebHealthCardScreen() {
  const router = useRouter();
  const { requireAuth } = useAuthActionGuard();

  function handlePlanView() {
    const user = requireAuth("/health-card");
    if (!user) return;
    router.push("/subscription-plans");
  }

  return (
    <DashboardFrame title="Health Card" subtitle="Review customer plans, document readiness, and health-card style member benefits from a dedicated web entry point.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Health Card</span>
        <h2 style={styles.heroHeadingAlt}>Membership plans, records, and care benefits in one customer view.</h2>
        <p style={styles.heroCopy}>The mobile app uses this service family for plan access and documentation, so this web page brings the same workflows together cleanly.</p>
      </section>

      <div style={styles.twoColumnGrid}>
        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Available Plans</h2>
          </div>
          <div style={styles.planCardGrid}>
            {subscriptionPlans.map((plan) => (
              <div key={plan.name} style={styles.membershipCard}>
                <span style={styles.subscriptionTag}>Health Card Plan</span>
                <h3 style={styles.tileTitle}>{plan.name}</h3>
                <div style={styles.membershipPrice}>{plan.price}</div>
                <p style={styles.tileCopy}>{plan.detail}</p>
                <button type="button" onClick={handlePlanView} style={styles.primaryAction}>View Plan</button>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>What You Can Manage</h2>
          </div>
          <div style={styles.stackList}>
            {[
              ["Health card details", "Keep your membership reference, identity details, and service eligibility ready."],
              ["Documents", "Prepare prescriptions, reports, and patient documents for assisted verification."],
              ["Benefits", "Use the same plan family for savings on consultations, diagnostics, and pharmacy journeys."],
            ].map(([title, copy]) => (
              <div key={title} style={styles.stepCard}>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardFrame>
  );
}

export function WebCareStaffScreen() {
  const [staff, setStaff] = useState<StaffingProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedStaffingProviders()
      .then(setStaff)
      .finally(() => setLoading(false));
  }, []);

  const filtered = staff.filter((item) => {
    const haystack = `${item.name} ${item.profession} ${item.city} ${item.qualifications}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <DashboardFrame title="Care Staff" subtitle="Find approved nurses, caregivers, and trained support staff from the same staffing service family available in the app.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Care Staff</span>
        <h2 style={styles.heroHeadingAlt}>Browse approved home-care and support professionals.</h2>
        <p style={styles.heroCopy}>This web screen mirrors the staffing discovery layer so patients can review availability, experience, and rates with more space.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search nurse, caregiver, attendant, city..."
        />
      </section>

      {loading ? <div style={styles.noticeCard}>Loading care staff providers...</div> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved care staff providers available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {filtered.map((item) => (
          <div key={item.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={item.avatarUrl}
              fallbackSrc="/service-staff.svg"
              alt={item.name}
              label={getInitials(item.name)}
              style={styles.staffVisual}
              textStyle={styles.visualInitials}
            />
            <span style={styles.blogTag}>{item.profession}</span>
            <h3 style={styles.tileTitle}>{item.name}</h3>
            <p style={styles.tileCopy}>{item.qualifications || "Approved staffing provider"}</p>
            <div style={styles.tileMetaGrid}>
              <span>{item.city}</span>
              <span>{item.experience != null ? `${item.experience}+ yrs` : "Experience on request"}</span>
            </div>
            <div style={styles.tileFooter}>
              <strong>{item.fee != null ? `${formatMoney(item.fee)} / shift` : "Quote on request"}</strong>
              <span style={styles.availableLabel}>Request staff</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebAmbulanceScreen() {
  return (
    <DashboardFrame title="Ambulance" subtitle="Request emergency transport and review the same emergency-response journey in a web-optimized layout.">
      <div style={styles.twoColumnGrid}>
        <section style={styles.heroPanel}>
          <div style={styles.heroTag}>24×7 Emergency</div>
          <h2 style={styles.heroHeading}>Emergency transport with quicker action steps.</h2>
          <p style={styles.heroCopy}>Use this web entry point for ambulance help, emergency guidance, and hospital escalation when you need rapid support.</p>
          <div style={styles.heroActionRow}>
            <a href="tel:01244567890" style={styles.primaryActionLink}>Call 0124 456 7890</a>
            <Link href="/support" style={styles.secondaryActionLink}>Emergency support ticket</Link>
          </div>
        </section>

        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Tracked milestones</h2>
          </div>
          <div style={styles.stackList}>
            {[
              ["Request Created", "Share pickup location, patient context, and destination hospital."],
              ["Vehicle Assigned", "The same workflow can show dispatch status and estimated arrival."],
              ["Trip Completed", "Review bill summary, care handoff, and history in one place."],
            ].map(([title, copy]) => (
              <div key={title} style={styles.stepCard}>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardFrame>
  );
}

export function WebRecordsScreen() {
  return (
    <DashboardFrame title="Records" subtitle="Keep prescriptions, reports, consultation summaries, and health paperwork together in a single web record locker.">
      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Digital Health Locker</h2>
        </div>
        <div style={styles.metricsGrid}>
          {recordsSummary.map((item) => (
            <div key={item.label} style={styles.metricCard}>
              <span style={styles.metricLabel}>{item.label}</span>
              <strong style={styles.metricValue}>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.serviceTileGrid}>
        {[
          ["Prescriptions", "View doctor prescriptions and medication instructions in one place."],
          ["Lab Reports", "Store report delivery history and downloadable diagnostic records."],
          ["Consultation Notes", "Review doctor summaries, visit context, and future plan details."],
          ["Insurance Docs", "Keep health cards and supporting paperwork easy to access."],
        ].map(([title, copy]) => (
          <div key={title} style={styles.infoTileCard}>
            <h3 style={styles.tileTitle}>{title}</h3>
            <p style={styles.tileCopy}>{copy}</p>
          </div>
        ))}
      </div>
    </DashboardFrame>
  );
}

export function WebSubscriptionPlansScreen() {
  const { requireAuth } = useAuthActionGuard();

  return (
    <DashboardFrame title="Subscription Plans" subtitle="Explore bundled health-card style plans and member benefits in the same service family as the app.">
      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Membership Plans</h2>
        </div>
        <div style={styles.planCardGrid}>
          {subscriptionPlans.map((plan) => (
            <div key={plan.name} style={styles.membershipCard}>
              <span style={styles.subscriptionTag}>Plan</span>
              <h3 style={styles.tileTitle}>{plan.name}</h3>
              <div style={styles.membershipPrice}>{plan.price}</div>
              <p style={styles.tileCopy}>{plan.detail}</p>
              <button
                type="button"
                style={styles.primaryAction}
                onClick={() => {
                  requireAuth("/subscription-plans");
                }}
              >
                Choose Plan
              </button>
            </div>
          ))}
        </div>
      </section>
    </DashboardFrame>
  );
}

export function WebSupportScreen() {
  const { user, state: authState, configured, requireAuth } = useAuthActionGuard();
  const [tickets, setTickets] = useState<SupportTicketSummary[] | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Booking help");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState({ loading: false, message: "", error: "" });
  const loading = configured && Boolean(user?.id) && tickets === null;

  useEffect(() => {
    let active = true;
    if (!configured || !user?.id) {
      return () => {
        active = false;
      };
    }

    fetchSupportTickets(user.id)
      .then((items) => {
        if (!active) return;
        setTickets(items);
      })
      .catch(() => {
        if (!active) return;
        setTickets([]);
      });

    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const authUser = requireAuth("/support");
    if (!authUser) return;

    setSubmitState({ loading: true, message: "", error: "" });
    try {
      await createSupportTicket({
        userId: authUser.id,
        userEmail: authUser.email,
        subject,
        category,
        message,
      });
      const refreshed = await fetchSupportTickets(authUser.id);
      setTickets(refreshed);
      setSubject("");
      setMessage("");
      setSubmitState({ loading: false, message: "Support ticket submitted successfully.", error: "" });
    } catch (error) {
      setSubmitState({
        loading: false,
        message: "",
        error: error instanceof Error ? error.message : "Unable to submit support ticket.",
      });
    }
  }

  return (
    <DashboardFrame title="Support" subtitle="Raise tickets, track responses, and review common issue paths from the same shared support system.">
      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Support Topics</h2>
        </div>
        <div style={styles.topicGrid}>
          {supportTopics.map((topic) => (
            <div key={topic} style={styles.topicChipCard}>
              {topic}
            </div>
          ))}
        </div>
      </section>

      {!configured ? <div style={styles.noticeCard}>Supabase env is missing for support access.</div> : null}
      {configured && authState.loading ? <div style={styles.noticeCard}>Checking your customer session...</div> : null}
      {configured && !authState.loading && !user ? (
        <div style={styles.noticeCard}>Login with the same customer account to raise and review support tickets.</div>
      ) : null}

      {configured && user ? (
        <div style={styles.twoColumnGrid}>
          <section style={styles.sectionBlock}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Your Support Tickets</h2>
            </div>
            {loading ? <div style={styles.noticeCard}>Loading support tickets...</div> : null}
            {!loading && tickets && !tickets.length ? <div style={styles.noticeCard}>No support tickets yet.</div> : null}
            <div style={styles.stackList}>
              {(tickets || []).map((ticket) => (
                <div key={ticket.id} style={styles.stepCard}>
                  <strong>{ticket.subject}</strong>
                  <p>{ticket.category} · {ticket.priority}</p>
                  <div style={styles.tileMetaGrid}>
                    <span>{ticket.status}</span>
                    <span>{ticket.lastMessageAt || "Just now"}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.sectionBlock}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Raise a Ticket</h2>
            </div>
            {submitState.error ? <div style={styles.errorNote}>{submitState.error}</div> : null}
            {submitState.message ? <div style={styles.noticeCard}>{submitState.message}</div> : null}
            <form onSubmit={handleSubmit} style={styles.formStack}>
              <label style={styles.fieldLabel}>Subject</label>
              <input style={styles.fieldInput} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Describe the issue" required />
              <label style={styles.fieldLabel}>Category</label>
              <select style={styles.fieldInput} value={category} onChange={(event) => setCategory(event.target.value)}>
                {supportTopics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
              <label style={styles.fieldLabel}>Details</label>
              <textarea
                style={styles.textArea}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share booking ids, payment concerns, or support context"
                required
              />
              <button style={styles.primaryAction} type="submit" disabled={submitState.loading}>
                {submitState.loading ? "Submitting..." : "Submit Support Request"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </DashboardFrame>
  );
}

export function WebPharmacyCartScreen() {
  const cart = useCart();
  const { requireAuth } = useAuthActionGuard();
  const [submitting, setSubmitting] = useState(false);

  async function handleCheckout() {
    if (!cart.lines.length) return;
    const user = requireAuth("/pharmacy/cart");
    if (!user) return;
    if (!getCallServerBase()) {
      alert("NEXT_PUBLIC_CALL_SERVER_URL is missing for Razorpay checkout.");
      return;
    }
    setSubmitting(true);
    try {
      await beginWebPayment({
        kind: "pharmacy_order",
        returnTo: "/pharmacy/orders",
        redirectUri: `${window.location.origin}/payment-callback`,
        order: {
          paymentMethod: "upi",
          total: cart.total,
          itemCount: cart.itemCount,
          pharmacyName: "Austy Pharmacy",
          items: cart.lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            price: line.product.price,
            name: line.product.name,
          })),
        },
        payment: {
          serviceType: "pharmacy_order",
          serviceLabel: "Austy Pharmacy",
          description: `${cart.itemCount} items from pharmacy`,
          amount: cart.total,
          paymentMethod: "upi",
          providerName: "Austy Pharmacy",
          customer: {
            name: user.name,
            email: user.email,
            phone: user.phone,
          },
          metadata: {
            itemCount: cart.itemCount,
            total: cart.total,
          },
        },
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to start pharmacy payment.");
      setSubmitting(false);
    }
  }

  return (
    <DashboardFrame title="Cart" subtitle={`${cart.itemCount} items ready for checkout with the same Razorpay handoff used by the mobile app.`}>
      <div style={styles.cartLayout}>
        <section style={styles.sectionBlock}>
          <div style={styles.noticeCard}>You unlocked free delivery on this order.</div>
          {cart.lines.map((line) => (
            <div key={line.product.id} style={styles.cartLine}>
              <MarketplaceImage
                src={line.product.imageUrl}
                fallbackSrc="/service-pharmacy.svg"
                alt={line.product.name}
                label={getInitials(line.product.name)}
                style={{ ...styles.cartImage, background: line.product.tone }}
                textStyle={styles.visualInitials}
                fit="contain"
                sizes="112px"
              />
              <div style={styles.cartContent}>
                <strong>{line.product.name}</strong>
                <span style={styles.productMeta}>{line.product.subtitle} · {line.product.inStock} in stock</span>
                <div style={styles.priceRow}>
                  <strong>{formatMoney(line.product.price)}</strong>
                  <span style={styles.strikeText}>{formatMoney(line.product.mrp)}</span>
                </div>
                <div style={styles.quantityBox}>
                  <button style={styles.quantityButton} onClick={() => decrementProduct(line.product.id)}>−</button>
                  <span>{line.quantity}</span>
                  <button style={styles.quantityButton} onClick={() => addProductToCart(line.product)}>+</button>
                </div>
              </div>
              <button style={styles.removeButton} onClick={() => removeProduct(line.product.id)}>Remove</button>
            </div>
          ))}
        </section>

        <aside style={styles.summaryPanel}>
          <h2 style={styles.sectionTitle}>Price Details</h2>
          <div style={styles.summaryLine}><span>Total MRP</span><strong>{formatMoney(cart.mrp)}</strong></div>
          <div style={styles.summaryLine}><span>Discount on MRP</span><strong style={styles.greenText}>- {formatMoney(cart.saved)}</strong></div>
          <div style={styles.summaryLine}><span>Delivery Fee</span><strong style={styles.greenText}>FREE</strong></div>
          <div style={styles.summaryTotal}><span>To Pay</span><strong>{formatMoney(cart.total)}</strong></div>
          <button onClick={handleCheckout} style={{ ...styles.primaryAction, width: "100%" }} disabled={submitting || !cart.itemCount}>
            {submitting ? "Starting..." : "Proceed to Checkout"}
          </button>
        </aside>
      </div>
    </DashboardFrame>
  );
}

export function WebPharmacyOrdersScreen() {
  const orders = useOrders();

  return (
    <DashboardFrame title="My Pharmacy Orders" subtitle="Orders placed from checkout appear here instantly, matching the app’s pharmacy order flow.">
      {!orders.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No pharmacy orders yet</h2>
          <p style={styles.emptyCopy}>Orders placed from checkout will appear here instantly.</p>
          <Link href="/pharmacy" style={styles.primaryActionLink}>Browse Medicines</Link>
        </section>
      ) : (
        <div style={styles.orderGrid}>
          {orders.map((order) => (
            <div key={order.id} style={styles.orderCard}>
              <strong>{order.pharmacyName}</strong>
              <span>{order.itemCount} items</span>
              <small>{formatMoney(order.total)} · {order.status}</small>
              <p>{formatDate(order.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </DashboardFrame>
  );
}

function PaymentCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState("Verifying payment...");

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const { pending } = await verifyWebPayment(searchParams);
        if (!active) return;

        if (pending.kind === "doctor_booking") {
          addLocalBooking({ ...pending.appointment });
        } else if (pending.kind === "pharmacy_order") {
          addLocalOrder({ ...pending.order });
          clearCart();
        }

        clearPendingPayment();
        setState("Payment verified. Redirecting...");
        router.replace(pending.returnTo);
      } catch (error) {
        setState(error instanceof Error ? error.message : "Unable to verify payment.");
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div style={styles.authPage}>
      <div style={styles.callbackPanel}>
        <h1 style={styles.authHeadline}>Payment Callback</h1>
        <p style={styles.authCopy}>{state}</p>
        {getPendingPayment() ? null : <Link href="/" style={styles.primaryActionLink}>Go Home</Link>}
      </div>
    </div>
  );
}

export function WebPaymentCallbackScreen() {
  return (
    <Suspense fallback={<div style={styles.authPage}><div style={styles.callbackPanel}>Loading payment callback...</div></div>}>
      <PaymentCallbackInner />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  authPage: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f5f8ff 0%, #eef3ff 100%)",
    padding: "32px 20px",
    display: "grid",
    placeItems: "center",
  },
  authGrid: {
    width: "100%",
    maxWidth: 1240,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(420px, 0.9fr)",
    gap: 28,
    alignItems: "stretch",
  },
  authVisual: {
    background: "linear-gradient(160deg, rgba(37,99,235,0.96), rgba(15,23,42,0.94))",
    color: "#fff",
    borderRadius: 36,
    padding: 36,
    boxShadow: "0 32px 80px rgba(37,99,235,0.22)",
    display: "grid",
    gap: 22,
    alignContent: "start",
    minHeight: 680,
  },
  authBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    padding: "10px 16px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    fontWeight: 800,
  },
  authHeadline: {
    margin: 0,
    fontSize: "clamp(2.3rem, 4vw, 4.6rem)",
    lineHeight: 1,
    letterSpacing: "-0.06em",
  },
  authCopy: {
    margin: 0,
    fontSize: "1.02rem",
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.84)",
  },
  authHighlightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
    gap: 14,
    marginTop: 12,
  },
  authHighlightCard: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: "18px 20px",
    borderRadius: 24,
    background: "rgba(255,255,255,0.11)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  authHighlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    color: "#2f59ff",
    fontWeight: 900,
  },
  authPanel: {
    background: "#fff",
    borderRadius: 36,
    padding: 32,
    boxShadow: "0 28px 70px rgba(15,23,42,0.09)",
    border: "1px solid #dbe5f4",
    position: "relative",
  },
  authPanelBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    height: 8,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    background: "#2f59ff",
  },
  authPanelTitle: {
    margin: "22px 0 8px",
    fontSize: "2.4rem",
    lineHeight: 1,
    letterSpacing: "-0.05em",
    color: "#20346d",
  },
  authPanelCopy: {
    margin: "0 0 24px",
    color: "#6b7ba5",
    fontSize: "1.02rem",
  },
  authForm: {
    display: "grid",
    gap: 12,
  },
  fieldLabel: {
    fontWeight: 700,
    color: "#20346d",
    marginTop: 6,
  },
  fieldInput: {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    border: "1px solid #d6e2ff",
    background: "#fdfefe",
    padding: "0 18px",
    fontSize: "1rem",
    color: "#0f172a",
  },
  inlineLinkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textButton: {
    border: "none",
    background: "transparent",
    color: "#2f59ff",
    fontWeight: 700,
    cursor: "pointer",
  },
  errorNote: {
    padding: "12px 14px",
    borderRadius: 16,
    background: "#fff1f2",
    color: "#be123c",
    border: "1px solid #fecdd3",
  },
  primaryAction: {
    minHeight: 54,
    borderRadius: 18,
    border: "none",
    background: "#2f59ff",
    color: "#fff",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0 18px",
  },
  secondaryAction: {
    minHeight: 50,
    borderRadius: 18,
    border: "1px solid #d6e2ff",
    background: "#fff",
    color: "#20346d",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
  },
  linkAction: {
    border: "none",
    background: "transparent",
    color: "#2f59ff",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: 6,
  },
  authDivider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#8a97b4",
    justifyContent: "center",
    marginTop: 6,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    background: "#e5ebf8",
  },
  authQuickRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  authSwitch: {
    marginTop: 4,
    color: "#20346d",
    fontWeight: 700,
    textAlign: "center",
  },
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    background: "linear-gradient(180deg, #f7f9ff 0%, #edf2ff 100%)",
  },
  sidebar: {
    padding: 24,
    borderRight: "1px solid #dde7fb",
    background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(241,246,255,0.98))",
    display: "grid",
    alignContent: "start",
    gap: 18,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 18,
    background: "linear-gradient(135deg, #2f59ff, #6a86ff)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    boxShadow: "0 20px 48px rgba(47,89,255,0.28)",
  },
  brandTitle: {
    display: "block",
    color: "#20346d",
  },
  brandSub: {
    color: "#7b8aad",
  },
  navList: {
    display: "grid",
    gap: 8,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid transparent",
    color: "#20346d",
  },
  navItemActive: {
    background: "rgba(47,89,255,0.08)",
    borderColor: "rgba(47,89,255,0.16)",
  },
  navItemShort: {
    fontWeight: 800,
  },
  navItemLabel: {
    color: "#7b8aad",
  },
  sidebarPromo: {
    marginTop: "auto",
    borderRadius: 28,
    padding: 22,
    color: "#fff",
    background: "linear-gradient(160deg, #17388f, #2f59ff)",
    boxShadow: "0 28px 64px rgba(47,89,255,0.26)",
    display: "grid",
    gap: 12,
  },
  sidebarPromoTag: {
    fontSize: "0.76rem",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    opacity: 0.84,
    fontWeight: 800,
  },
  sidebarPromoTitle: {
    margin: 0,
    fontSize: "1.4rem",
    lineHeight: 1.1,
  },
  sidebarPromoCopy: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.6,
  },
  sidebarPromoButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    minHeight: 46,
    padding: "0 16px",
    borderRadius: 14,
    background: "#fff",
    color: "#17388f",
    fontWeight: 800,
  },
  mainArea: {
    minWidth: 0,
    padding: 28,
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
    marginBottom: 24,
  },
  pageEyebrow: {
    color: "#2f59ff",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "0.74rem",
    marginBottom: 10,
  },
  pageTitle: {
    margin: 0,
    color: "#20346d",
    fontSize: "clamp(2rem, 3vw, 3.4rem)",
    lineHeight: 1,
    letterSpacing: "-0.06em",
  },
  pageSubtitle: {
    margin: "10px 0 0",
    maxWidth: 760,
    color: "#6f7ea4",
    lineHeight: 1.7,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  topbarAccount: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  accountMeta: {
    display: "grid",
    gap: 2,
    textAlign: "right",
    color: "#20346d",
  },
  mainContent: {
    display: "grid",
    gap: 22,
  },
  headerPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 999,
    background: "#e9efff",
    color: "#2f59ff",
    fontWeight: 800,
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(340px, 0.9fr)",
    gap: 20,
  },
  heroPanel: {
    borderRadius: 32,
    background: "linear-gradient(135deg, #223a86 0%, #2f59ff 62%, #5f88ff 100%)",
    color: "#fff",
    padding: 30,
    boxShadow: "0 28px 70px rgba(47,89,255,0.26)",
    display: "grid",
    gap: 16,
  },
  heroTag: {
    display: "inline-flex",
    width: "fit-content",
    padding: "10px 16px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "0.78rem",
  },
  heroHeading: {
    margin: 0,
    fontSize: "clamp(2rem, 3vw, 3.4rem)",
    lineHeight: 1,
    letterSpacing: "-0.06em",
  },
  heroCopy: {
    margin: 0,
    color: "rgba(255,255,255,0.84)",
    lineHeight: 1.7,
  },
  heroActionRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 18px",
    borderRadius: 16,
    background: "#fff",
    color: "#20346d",
    fontWeight: 800,
  },
  secondaryActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 18px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.14)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.22)",
    fontWeight: 800,
  },
  sideFeatureStack: {
    display: "grid",
    gap: 18,
  },
  searchModule: {
    borderRadius: 28,
    background: "#fff",
    padding: 24,
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 8,
    color: "#20346d",
  },
  tipCard: {
    borderRadius: 28,
    background: "#fff",
    padding: 24,
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 10,
    color: "#20346d",
  },
  tipTag: {
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#eef3ff",
    color: "#4164f6",
    fontWeight: 800,
  },
  sectionBlock: {
    borderRadius: 30,
    background: "#fff",
    padding: 24,
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    margin: 0,
    color: "#20346d",
    fontSize: "1.7rem",
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
  },
  linkActionInline: {
    color: "#2f59ff",
    fontWeight: 800,
  },
  serviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },
  serviceCard: {
    display: "grid",
    gap: 12,
    padding: 18,
    borderRadius: 24,
    border: "1px solid #dbe5f4",
    background: "#f8fbff",
  },
  serviceIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "#eef3ff",
    color: "#2f59ff",
    fontWeight: 900,
  },
  dashboardSplit: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)",
    gap: 20,
  },
  blogRow: {
    display: "grid",
    gridTemplateColumns: "160px minmax(0, 1fr)",
    gap: 18,
    alignItems: "center",
    padding: "16px 0",
    borderTop: "1px solid #edf2fb",
  },
  blogVisual: {
    minHeight: 132,
    borderRadius: 22,
    background: "linear-gradient(135deg, #cbd8ff, #f7f9ff)",
    position: "relative",
    overflow: "hidden",
  },
  blogTag: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#eef3ff",
    color: "#4164f6",
    fontWeight: 800,
  },
  blogTitle: {
    margin: "12px 0 8px",
    color: "#20346d",
    fontSize: "1.6rem",
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
  },
  blogDetail: {
    margin: 0,
    color: "#6f7ea4",
    lineHeight: 1.7,
  },
  stackColumn: {
    display: "grid",
    gap: 20,
  },
  teleConsultCard: {
    borderRadius: 30,
    padding: 28,
    background: "linear-gradient(145deg, #1f2f68 0%, #253a84 54%, #3950ad 100%)",
    color: "#fff",
    display: "grid",
    gap: 14,
    boxShadow: "0 24px 60px rgba(31,47,104,0.26)",
  },
  liveChip: {
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#16a34a",
    color: "#fff",
    fontWeight: 800,
  },
  teleTitle: {
    margin: 0,
    fontSize: "2rem",
    lineHeight: 1,
    letterSpacing: "-0.04em",
  },
  teleCopy: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.7,
  },
  dualPromoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  subscriptionTile: {
    borderRadius: 28,
    padding: 24,
    background: "linear-gradient(160deg, #3659ef, #4f6fff)",
    color: "#fff",
    display: "grid",
    gap: 10,
  },
  emergencyTile: {
    borderRadius: 28,
    padding: 24,
    background: "#e03131",
    color: "#fff",
    display: "grid",
    gap: 10,
  },
  subscriptionTag: {
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "0.74rem",
  },
  heroWideCard: {
    borderRadius: 30,
    padding: 26,
    background: "linear-gradient(140deg, #233776, #344ea4)",
    color: "#fff",
    boxShadow: "0 24px 58px rgba(35,55,118,0.24)",
  },
  bluePill: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    color: "#fff",
    fontWeight: 800,
  },
  heroHeadingAlt: {
    margin: "14px 0 12px",
    fontSize: "2.4rem",
    lineHeight: 1.05,
    letterSpacing: "-0.05em",
  },
  heroMetricRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 12,
  },
  metricBadge: {
    display: "inline-flex",
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    fontWeight: 700,
  },
  filtersGrid: {
    display: "grid",
    gap: 14,
  },
  searchInput: {
    width: "100%",
    minHeight: 56,
    borderRadius: 18,
    border: "1px solid #dbe5f4",
    background: "#f8fbff",
    padding: "0 18px",
    fontSize: "1rem",
  },
  chipRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  filterChip: {
    minHeight: 42,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid #dbe5f4",
    background: "#fff",
    color: "#6f7ea4",
    fontWeight: 700,
    cursor: "pointer",
  },
  filterChipActive: {
    background: "#eef3ff",
    color: "#2f59ff",
    borderColor: "#bfcfff",
  },
  doctorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  doctorCard: {
    display: "grid",
    gridTemplateColumns: "180px minmax(0, 1fr)",
    gap: 18,
    borderRadius: 28,
    border: "1px solid #dbe5f4",
    background: "#fff",
    padding: 18,
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
  },
  doctorAvatarPanel: {
    minHeight: 190,
    borderRadius: 22,
    background: "linear-gradient(135deg, #cbd8ff, #f7f9ff)",
    width: "100%",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  doctorAvatarFallback: {
    color: "#4164f6",
    fontSize: "2.4rem",
    fontWeight: 900,
    letterSpacing: "-0.06em",
  },
  doctorBody: {
    display: "grid",
    alignContent: "start",
    gap: 8,
  },
  doctorTopline: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  doctorName: {
    margin: 0,
    color: "#20346d",
    fontSize: "1.8rem",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
  },
  verifiedBadge: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#eefaf2",
    color: "#16a34a",
    fontWeight: 800,
  },
  doctorSpecialty: {
    color: "#2f59ff",
    fontWeight: 800,
    fontSize: "1.2rem",
  },
  doctorMeta: {
    margin: 0,
    color: "#6f7ea4",
    lineHeight: 1.6,
  },
  doctorFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
    color: "#20346d",
  },
  availableLabel: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#eafbf4",
    color: "#16a34a",
    fontWeight: 800,
  },
  detailHeroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: 20,
  },
  profileCard: {
    borderRadius: 30,
    padding: 24,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gridTemplateColumns: "180px minmax(0, 1fr) 140px",
    gap: 18,
    alignItems: "start",
  },
  profileImage: {
    minHeight: 210,
    borderRadius: 24,
    background: "linear-gradient(135deg, #cbd8ff, #f7f9ff)",
    width: "100%",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    position: "relative",
  },
  profileImageFallback: {
    color: "#4164f6",
    fontSize: "3rem",
    fontWeight: 900,
    letterSpacing: "-0.06em",
  },
  profileInfo: {
    display: "grid",
    gap: 10,
  },
  profileName: {
    margin: 0,
    color: "#20346d",
    fontSize: "2.2rem",
    lineHeight: 1,
    letterSpacing: "-0.05em",
  },
  profileStats: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  priceAside: {
    display: "grid",
    justifyItems: "end",
    gap: 4,
    color: "#20346d",
  },
  aboutCard: {
    borderRadius: 30,
    padding: 24,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 16,
  },
  infoStatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  infoStatCard: {
    borderRadius: 20,
    padding: 18,
    background: "#f8fbff",
    border: "1px solid #e7eefb",
    display: "grid",
    gap: 8,
    color: "#6f7ea4",
  },
  planGrid: {
    display: "grid",
    gap: 14,
  },
  planChoice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: 18,
    borderRadius: 22,
    border: "1px solid #dbe5f4",
    background: "#fff",
    color: "#20346d",
    cursor: "pointer",
  },
  planChoiceActive: {
    borderColor: "#2f59ff",
    background: "#eef3ff",
  },
  planAmount: {
    fontWeight: 900,
    color: "#2f59ff",
  },
  checkoutBar: {
    position: "sticky",
    bottom: 18,
    zIndex: 2,
    borderRadius: 24,
    padding: 18,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  checkoutTitle: {
    display: "block",
    color: "#20346d",
  },
  checkoutMeta: {
    display: "block",
    marginTop: 6,
    color: "#6f7ea4",
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(360px, 0.85fr)",
    gap: 20,
  },
  onlineMarker: {
    color: "#2f59ff",
    fontWeight: 800,
  },
  specialtyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  specialtyCard: {
    minHeight: 130,
    borderRadius: 22,
    border: "1px solid #dbe5f4",
    background: "#fff",
    color: "#20346d",
    padding: 16,
    display: "grid",
    gap: 10,
    justifyItems: "center",
    alignContent: "center",
    textAlign: "center",
    fontWeight: 700,
    cursor: "pointer",
  },
  specialtyCardActive: {
    borderColor: "#2f59ff",
    background: "#eef3ff",
    color: "#2f59ff",
  },
  specialtyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: "1px solid #dbe5f4",
  },
  textArea: {
    width: "100%",
    minHeight: 150,
    borderRadius: 18,
    border: "1px solid #d6e2ff",
    background: "#fff",
    padding: 18,
    fontSize: "1rem",
    resize: "vertical",
  },
  noticeCard: {
    borderRadius: 18,
    padding: 16,
    background: "#eef3ff",
    color: "#20346d",
    border: "1px solid #d6e2ff",
  },
  tabRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  tabButton: {
    minHeight: 48,
    padding: "0 18px",
    borderRadius: 16,
    border: "1px solid #dbe5f4",
    background: "#fff",
    color: "#6f7ea4",
    fontWeight: 800,
    cursor: "pointer",
  },
  tabButtonActive: {
    background: "#2f59ff",
    color: "#fff",
    borderColor: "#2f59ff",
  },
  emptyPanel: {
    borderRadius: 30,
    padding: 40,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    textAlign: "center",
    display: "grid",
    gap: 12,
    justifyItems: "center",
  },
  emptyTitle: {
    margin: 0,
    color: "#20346d",
    fontSize: "2rem",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
  },
  emptyCopy: {
    margin: 0,
    color: "#6f7ea4",
  },
  appointmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  appointmentCard: {
    borderRadius: 24,
    border: "1px solid #dbe5f4",
    background: "#fff",
    padding: 18,
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 8,
    color: "#20346d",
  },
  profileLayout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 20,
  },
  profileOverview: {
    borderRadius: 30,
    padding: 28,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 14,
    justifyItems: "center",
    alignContent: "center",
    textAlign: "center",
  },
  profileMonogram: {
    width: 100,
    height: 100,
    borderRadius: 28,
    display: "grid",
    placeItems: "center",
    background: "#eef3ff",
    color: "#2f59ff",
    fontSize: "2rem",
    fontWeight: 900,
  },
  profileOverviewTitle: {
    margin: 0,
    color: "#20346d",
    fontSize: "2rem",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
  },
  profileOverviewCopy: {
    margin: 0,
    color: "#6f7ea4",
  },
  menuCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "18px 0",
    borderTop: "1px solid #edf2fb",
    color: "#20346d",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
  },
  productCard: {
    borderRadius: 24,
    border: "1px solid #dbe5f4",
    background: "#fff",
    padding: 18,
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 12,
  },
  productVisual: {
    minHeight: 180,
    borderRadius: 22,
    border: "1px solid #edf2fb",
    background: "#f8fbff",
  },
  visualInitials: {
    color: "#2f59ff",
    fontSize: "2.4rem",
    fontWeight: 900,
    letterSpacing: "-0.06em",
  },
  productTitle: {
    color: "#20346d",
    fontSize: "1.4rem",
    lineHeight: 1.15,
    letterSpacing: "-0.04em",
  },
  productMeta: {
    color: "#6f7ea4",
  },
  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    color: "#20346d",
  },
  stockText: {
    color: "#16a34a",
    fontWeight: 800,
  },
  quantityBox: {
    display: "inline-flex",
    alignItems: "center",
    gap: 18,
    width: "fit-content",
    minHeight: 50,
    padding: "0 18px",
    borderRadius: 16,
    border: "1px solid #bfd0ff",
    color: "#20346d",
    fontWeight: 800,
  },
  quantityButton: {
    border: "none",
    background: "transparent",
    color: "#2f59ff",
    fontSize: "1.8rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  pharmacyHero: {
    borderRadius: 30,
    padding: 24,
    background: "#2a45b8",
    color: "#fff",
    display: "grid",
    gap: 16,
  },
  deliveryBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pharmacySearch: {
    minHeight: 62,
    borderRadius: 18,
    background: "#fff",
    color: "#6f7ea4",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    fontWeight: 600,
  },
  cartLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) 360px",
    gap: 20,
    alignItems: "start",
  },
  cartLine: {
    display: "grid",
    gridTemplateColumns: "112px minmax(0, 1fr) auto",
    gap: 16,
    alignItems: "start",
    padding: "18px 0",
    borderTop: "1px solid #edf2fb",
  },
  cartImage: {
    minHeight: 112,
    borderRadius: 20,
    border: "1px solid #edf2fb",
    background: "#f8fbff",
  },
  cartContent: {
    display: "grid",
    gap: 8,
    color: "#20346d",
  },
  removeButton: {
    border: "none",
    background: "transparent",
    color: "#6f7ea4",
    fontWeight: 800,
    cursor: "pointer",
  },
  summaryPanel: {
    borderRadius: 30,
    padding: 24,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 14,
    position: "sticky",
    top: 20,
  },
  summaryLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    color: "#6f7ea4",
  },
  summaryTotal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 18,
    marginTop: 6,
    borderTop: "1px solid #edf2fb",
    color: "#20346d",
    fontWeight: 900,
    fontSize: "1.5rem",
  },
  greenText: {
    color: "#16a34a",
  },
  strikeText: {
    textDecoration: "line-through",
    color: "#94a3b8",
  },
  orderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },
  orderCard: {
    borderRadius: 24,
    padding: 18,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 8,
    color: "#20346d",
  },
  callbackPanel: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 30,
    padding: 32,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    textAlign: "center",
    display: "grid",
    gap: 18,
    justifyItems: "center",
  },
  serviceTileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },
  infoTileCard: {
    borderRadius: 24,
    padding: 20,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 10,
    color: "#20346d",
  },
  tileVisual: {
    minHeight: 220,
    borderRadius: 22,
    border: "1px solid #edf2fb",
    background: "#f8fbff",
  },
  staffVisual: {
    minHeight: 220,
    borderRadius: 22,
    border: "1px solid #edf2fb",
    background: "#f2f6ff",
  },
  tileTitle: {
    margin: 0,
    color: "#20346d",
    fontSize: "1.45rem",
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
  },
  serviceNameText: {
    color: "#20346d",
    fontSize: "1.05rem",
    fontWeight: 800,
  },
  tileCopy: {
    margin: 0,
    color: "#6f7ea4",
    lineHeight: 1.6,
  },
  tileMetaGrid: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "#6f7ea4",
  },
  tileFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
    color: "#20346d",
  },
  priceStack: {
    display: "grid",
    gap: 4,
    color: "#20346d",
  },
  stackList: {
    display: "grid",
    gap: 14,
  },
  stepCard: {
    borderRadius: 22,
    padding: 18,
    background: "#f8fbff",
    border: "1px solid #e7eefb",
    display: "grid",
    gap: 8,
    color: "#20346d",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  metricCard: {
    borderRadius: 22,
    padding: 20,
    background: "#f8fbff",
    border: "1px solid #e7eefb",
    display: "grid",
    gap: 10,
  },
  metricLabel: {
    color: "#6f7ea4",
    fontWeight: 700,
  },
  metricValue: {
    color: "#20346d",
    fontSize: "2rem",
    lineHeight: 1,
    letterSpacing: "-0.05em",
  },
  planCardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },
  membershipCard: {
    borderRadius: 26,
    padding: 22,
    background: "#fff",
    border: "1px solid #dbe5f4",
    boxShadow: "0 18px 48px rgba(32,52,109,0.08)",
    display: "grid",
    gap: 12,
    color: "#20346d",
  },
  membershipPrice: {
    color: "#2f59ff",
    fontSize: "1.7rem",
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  topicGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  topicChipCard: {
    borderRadius: 18,
    padding: "16px 18px",
    background: "#eef3ff",
    color: "#20346d",
    fontWeight: 800,
  },
  formStack: {
    display: "grid",
    gap: 12,
  },
};
