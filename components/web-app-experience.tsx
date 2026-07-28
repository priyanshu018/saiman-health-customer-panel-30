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
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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
  "linear-gradient(180deg, #eef2ff 0%, var(--surface-strong)fff 100%)",
  "linear-gradient(180deg, #effcf6 0%, var(--surface-strong)fff 100%)",
  "linear-gradient(180deg, var(--surface-strong)7ed 0%, var(--surface-strong)fff 100%)",
  "linear-gradient(180deg, #fdf2f8 0%, var(--surface-strong)fff 100%)",
  "linear-gradient(180deg, #ecfeff 0%, var(--surface-strong)fff 100%)",
];

const APP_FALLBACK_IMAGES = {
  hospital: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
  lab: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80",
  pharmacy: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=1200&q=80",
  careTeam: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1200&q=80",
} as const;

function toneFromSeed(seed: string) {
  const key = seed.trim().toLowerCase();
  const total = Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tonePalette[total % tonePalette.length];
}

function FadeInImage({
  src,
  alt,
  sizes,
  fit,
  imageStyle,
}: {
  src: string;
  alt: string;
  sizes?: string;
  fit: "cover" | "contain";
  imageStyle?: React.CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded ? <div className="skeleton-shimmer" style={{ position: "absolute", inset: 0 }} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={`marketplace-image-fade${loaded ? " is-loaded" : ""}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: fit,
          display: "block",
          ...imageStyle,
        }}
      />
    </>
  );
}

function MarketplaceImage({
  src,
  fallbackSrc,
  alt,
  label,
  style,
  textStyle,
  fit = "cover",
  sizes,
  imageStyle,
}: {
  src?: string | null;
  fallbackSrc?: string;
  alt: string;
  label: string;
  style: React.CSSProperties;
  textStyle?: React.CSSProperties;
  fit?: "cover" | "contain";
  sizes?: string;
  imageStyle?: React.CSSProperties;
}) {
  const imageSrc = src || fallbackSrc;

  const frameStyle = {
    ...style,
    position: "relative" as const,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  };

  if (imageSrc) {
    return (
      <div style={frameStyle}>
        <FadeInImage key={imageSrc} src={imageSrc} alt={alt} sizes={sizes} fit={fit} imageStyle={imageStyle} />
      </div>
    );
  }

  return (
    <div style={{ ...frameStyle, background: toneFromSeed(label) }}>
      <span style={textStyle}>{label}</span>
    </div>
  );
}

function SkeletonBlock({ style }: { style: React.CSSProperties }) {
  return <div className="skeleton-shimmer" style={style} />;
}

function TileCardSkeleton() {
  return (
    <div style={styles.infoTileCard}>
      <SkeletonBlock style={styles.tileVisual} />
      <SkeletonBlock style={{ width: "40%", height: 14, borderRadius: 999 }} />
      <SkeletonBlock style={{ width: "80%", height: 18, borderRadius: 8 }} />
      <SkeletonBlock style={{ width: "55%", height: 14, borderRadius: 8 }} />
      <SkeletonBlock style={{ width: "100%", height: 34, borderRadius: 10, marginTop: 6 }} />
    </div>
  );
}

function TileGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={styles.serviceTileGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <TileCardSkeleton key={index} />
      ))}
    </div>
  );
}

function DoctorCardSkeleton() {
  return (
    <div style={styles.doctorCard}>
      <SkeletonBlock style={styles.doctorAvatarPanel} />
      <div style={{ display: "grid", gap: 8 }}>
        <SkeletonBlock style={{ width: "70%", height: 16, borderRadius: 8 }} />
        <SkeletonBlock style={{ width: "50%", height: 13, borderRadius: 8 }} />
        <SkeletonBlock style={{ width: "85%", height: 13, borderRadius: 8 }} />
      </div>
    </div>
  );
}

function DoctorGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={styles.doctorGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <DoctorCardSkeleton key={index} />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div style={styles.productCard}>
      <SkeletonBlock style={styles.productVisual} />
      <SkeletonBlock style={{ width: "75%", height: 18, borderRadius: 8 }} />
      <SkeletonBlock style={{ width: "50%", height: 13, borderRadius: 8 }} />
      <SkeletonBlock style={{ width: "40%", height: 20, borderRadius: 8 }} />
      <SkeletonBlock style={{ width: "100%", height: 34, borderRadius: 10 }} />
    </div>
  );
}

function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={styles.productGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

function DoctorImage({
  doctor,
  style,
  textStyle,
  imageStyle,
}: {
  doctor: Pick<DoctorSummary, "name" | "avatarUrl">;
  style: React.CSSProperties;
  textStyle?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
}) {
  return (
    <MarketplaceImage
      src={doctor.avatarUrl}
      alt={doctor.name}
      label={getInitials(doctor.name)}
      style={style}
      textStyle={textStyle}
      imageStyle={imageStyle}
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
          <div style={styles.authBadge}>✚ Saiman Healthcare</div>
          <h1 style={styles.authHeadline}>{title}</h1>
          <p style={styles.authCopy}>{subtitle}</p>
          <div style={styles.authHighlightGrid}>
            {[
              "Book doctor consults with approved specialists",
              "Order medicines, track pharmacy checkout and payments",
              "Manage appointments, instant calls, and care history in one place",
            ].map((item) => (
              <div key={item} style={styles.authHighlightCard}>
                <span style={styles.authHighlightIcon}>✓</span>
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
            <strong style={styles.brandTitle}>Saiman Healthcare</strong>
            <small style={styles.brandSub}>Customer Care Portal</small>
          </div>
        </Link>

        <div style={styles.navGroupLabel}>Menu</div>
        <nav style={styles.navList}>
          {primaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}>
                <span style={{ ...styles.navItemIcon, ...(active ? styles.navItemIconActive : {}) }}>{item.label.slice(0, 1)}</span>
                <span style={styles.navItemLabel}>{item.label}</span>
                {active ? <span style={styles.navItemDot} /> : null}
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarPromo}>
          <span style={styles.sidebarPromoTag}>Live support</span>
          <h3 style={styles.sidebarPromoTitle}>Need urgent medical guidance?</h3>
          <p style={styles.sidebarPromoCopy}>Start the same instant-call flow from the app, now optimized for web.</p>
          <Link href="/instant-call" style={styles.sidebarPromoButton}>Start Instant Call</Link>
        </div>
      </aside>

      <div style={styles.mainArea}>
        <header style={styles.topNav}>
          <div style={styles.topNavSearch}>
            <span style={styles.topNavSearchIcon}>⌕</span>
            <span style={styles.topNavSearchText}>Search doctors, tests, medicines, orders…</span>
          </div>
          <div style={styles.topNavRight}>
            {accent}
            <button type="button" style={styles.iconButton} aria-label="Notifications">🔔</button>
            <div style={styles.topbarAccount}>
              <div style={styles.accountAvatar}>{(user?.name || "G").slice(0, 1).toUpperCase()}</div>
              <div style={styles.accountMeta}>
                <strong>{user?.name || "Guest Customer"}</strong>
                <span>{user?.email || "Browse first, sign up when you book"}</span>
              </div>
              <CustomerShellAuthActions />
            </div>
          </div>
        </header>

        <main style={styles.mainScroll}>
          <div style={styles.mainInner}>
            <div style={styles.pageHeaderRow}>
              <div>
                <div style={styles.pageEyebrow}>Saiman Customer Experience</div>
                <h1 style={styles.pageTitle}>{title}</h1>
                <p style={styles.pageSubtitle}>{subtitle}</p>
              </div>
            </div>
            <section style={styles.mainContent}>{children}</section>
          </div>
        </main>
      </div>
    </div>
  );
}

export function WebHomeScreen() {
  const { user } = useCustomerUser();
  const cart = useCart();
  const bookings = useBookings();
  const orders = useOrders();

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

  const overviewStats = [
    { label: "Upcoming appointments", value: String(bookings.filter((item) => item.status === "upcoming").length), href: "/appointments" },
    { label: "Cart items", value: String(cart.itemCount), href: "/pharmacy/cart" },
    { label: "Pharmacy orders", value: String(orders.length), href: "/pharmacy/orders" },
    { label: "Health card", value: "Active", href: "/health-card" },
  ];

  return (
    <DashboardFrame
      title={`Good morning, ${user?.name || "Customer"}!`}
      subtitle="This web dashboard follows the same customer flow as the app: discover services, book doctors, pay online, and manage orders from one place."
      accent={cart.itemCount ? <Link href="/pharmacy/cart" style={styles.headerPill}>Cart · {cart.itemCount}</Link> : undefined}
    >
      <div style={styles.statRow}>
        {overviewStats.map((stat) => (
          <Link key={stat.label} href={stat.href} style={styles.statCard}>
            <span style={styles.statLabel}>{stat.label}</span>
            <strong style={styles.statValue}>{stat.value}</strong>
          </Link>
        ))}
      </div>

      <div style={styles.heroGrid}>
        <section style={styles.heroPanel}>
          <div style={styles.heroTag}>Limited time</div>
          <h2 style={styles.heroHeading}>20% off lab tests. One place for every healthcare service.</h2>
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

      {loading ? <DoctorGridSkeleton /> : null}

      <div style={styles.doctorGrid}>
        {loading ? null : filtered.map((doctor) => (
          <Link key={doctor.id} href={`/doctors/${doctor.id}`} style={styles.doctorCard}>
            <DoctorImage
              doctor={doctor}
              style={styles.doctorAvatarPanel}
              textStyle={styles.doctorAvatarFallback}
              imageStyle={styles.doctorAvatarImage}
            />
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
                {doctor.name} is verified on Saiman Healthcare and available for appointments through the same customer platform used by the app.
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
    accent: "var(--brand)",
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
        fallbackSrc={APP_FALLBACK_IMAGES.pharmacy}
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

      {loading ? <ProductGridSkeleton /> : null}

      {loading ? null : categories.map((category) => (
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

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved lab tests available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((test) => (
          <div key={test.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={test.imageUrl}
              fallbackSrc={APP_FALLBACK_IMAGES.lab}
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

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved hospital services available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((service) => (
          <div key={service.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={service.imageUrl}
              fallbackSrc={APP_FALLBACK_IMAGES.hospital}
              alt={service.serviceName}
              label={getInitials(service.serviceName)}
              style={styles.tileVisual}
              textStyle={styles.visualInitials}
            />
            <div style={styles.tileMetaGrid}>
              <span style={styles.blogTag}>Saiman Verified</span>
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

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved CT / MRI services available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((service) => (
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

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved rental equipment available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((item) => (
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

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? <div style={styles.noticeCard}>No approved care staff providers available yet.</div> : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((item) => (
          <div key={item.id} style={styles.infoTileCard}>
            <MarketplaceImage
              src={item.avatarUrl}
              fallbackSrc={APP_FALLBACK_IMAGES.careTeam}
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
          pharmacyName: "Saiman Pharmacy",
          items: cart.lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            price: line.product.price,
            name: line.product.name,
          })),
        },
        payment: {
          serviceType: "pharmacy_order",
          serviceLabel: "Saiman Pharmacy",
          description: `${cart.itemCount} items from pharmacy`,
          amount: cart.total,
          paymentMethod: "upi",
          providerName: "Saiman Pharmacy",
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
                fallbackSrc={APP_FALLBACK_IMAGES.pharmacy}
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

const themeStyles = {
  pageGradient: "linear-gradient(180deg, var(--bg) 0%, var(--surface-alt) 100%)",
  authGradient: "linear-gradient(160deg, var(--brand) 0%, var(--brand-deep) 100%)",
  brandGradient: "linear-gradient(135deg, var(--brand), var(--brand-soft))",
  heroGradient: "linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 62%, var(--brand-soft) 100%)",
  darkCardGradient: "linear-gradient(145deg, var(--brand-deep) 0%, #1d4f91 54%, var(--brand) 100%)",
  promoGradient: "linear-gradient(160deg, var(--brand-deep), var(--brand))",
  panel: "var(--surface-strong)",
  panelSoft: "var(--surface)",
  panelAlt: "var(--surface-alt)",
  line: "var(--line)",
  lineStrong: "var(--line-strong)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  muted: "var(--muted)",
  brand: "var(--brand)",
  brandDeep: "var(--brand-deep)",
  brandTint: "var(--brand-tint)",
  success: "var(--success)",
  successSoft: "var(--accent-soft)",
  danger: "var(--danger)",
  dangerSoft: "var(--danger-soft)",
  dangerLine: "var(--danger-line)",
  shadow: "var(--shadow)",
  shadowStrong: "var(--shadow-strong)",
  shadowBrand: "var(--shadow-brand)",
} as const;

const styles: Record<string, React.CSSProperties> = {
  authPage: {
    minHeight: "100vh",
    background: themeStyles.pageGradient,
    padding: "32px 20px",
    display: "grid",
    placeItems: "center",
  },
  authGrid: {
    width: "100%",
    maxWidth: 1120,
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(420px, 0.9fr)",
    gap: 22,
    alignItems: "stretch",
  },
  authVisual: {
    background: themeStyles.authGradient,
    color: "var(--surface-strong)",
    borderRadius: 10,
    padding: 28,
    
    display: "grid",
    gap: 18,
    alignContent: "start",
    minHeight: 560,
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
    fontSize: "clamp(1.6rem, 2.6vw, 2.2rem)",
    lineHeight: 1.25,
    letterSpacing: "-0.01em",
    fontWeight: 800,
  },
  authCopy: {
    margin: 0,
    fontSize: "0.94rem",
    lineHeight: 1.6,
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
    borderRadius: 14,
    background: "rgba(255,255,255,0.11)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  authHighlightIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: themeStyles.panel,
    color: themeStyles.brand,
    fontWeight: 900,
  },
  authPanel: {
    background: themeStyles.panel,
    borderRadius: 10,
    padding: 26,
    
    border: `1px solid ${themeStyles.line}`,
    position: "relative",
  },
  authPanelBorder: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    height: 7,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    background: themeStyles.brand,
  },
  authPanelTitle: {
    margin: "18px 0 6px",
    fontSize: "1.5rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    fontWeight: 800,
    color: themeStyles.brandDeep,
  },
  authPanelCopy: {
    margin: "0 0 20px",
    color: themeStyles.inkSoft,
    fontSize: "1.02rem",
  },
  authForm: {
    display: "grid",
    gap: 12,
  },
  fieldLabel: {
    fontWeight: 700,
    color: themeStyles.brandDeep,
    marginTop: 6,
  },
  fieldInput: {
    width: "100%",
    minHeight: 56,
    borderRadius: 10,
    border: `1px solid ${themeStyles.lineStrong}`,
    background: themeStyles.panel,
    padding: "0 18px",
    fontSize: "1rem",
    color: themeStyles.ink,
  },
  inlineLinkRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textButton: {
    border: "none",
    background: "transparent",
    color: themeStyles.brand,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorNote: {
    padding: "12px 14px",
    borderRadius: 10,
    background: themeStyles.dangerSoft,
    color: themeStyles.danger,
    border: `1px solid ${themeStyles.dangerLine}`,
  },
  primaryAction: {
    minHeight: 54,
    borderRadius: 10,
    border: "none",
    background: themeStyles.brand,
    color: "var(--surface-strong)",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0 18px",
  },
  secondaryAction: {
    minHeight: 50,
    borderRadius: 10,
    border: `1px solid ${themeStyles.lineStrong}`,
    background: themeStyles.panel,
    color: themeStyles.brandDeep,
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 18px",
  },
  linkAction: {
    border: "none",
    background: "transparent",
    color: themeStyles.brand,
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: 6,
  },
  authDivider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: themeStyles.muted,
    justifyContent: "center",
    marginTop: 6,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    background: themeStyles.line,
  },
  authQuickRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  authSwitch: {
    marginTop: 4,
    color: themeStyles.brandDeep,
    fontWeight: 700,
    textAlign: "center",
  },
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "236px minmax(0, 1fr)",
    background: themeStyles.panelAlt,
  },
  sidebar: {
    padding: "20px 14px",
    borderRight: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
    display: "grid",
    alignContent: "start",
    gap: 6,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 8px 18px",
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: themeStyles.brandGradient,
    color: "var(--surface-strong)",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    fontSize: "0.95rem",
  },
  brandTitle: {
    display: "block",
    color: themeStyles.brandDeep,
    fontSize: "0.95rem",
  },
  brandSub: {
    color: themeStyles.muted,
    fontSize: "0.76rem",
  },
  navGroupLabel: {
    fontSize: "0.68rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    color: themeStyles.muted,
    padding: "6px 10px 4px",
  },
  navList: {
    display: "grid",
    gap: 2,
  },
  navItem: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    borderRadius: 8,
    border: "1px solid transparent",
    color: themeStyles.inkSoft,
    fontSize: "0.88rem",
  },
  navItemActive: {
    background: themeStyles.brandTint,
    borderColor: themeStyles.lineStrong,
    color: themeStyles.brandDeep,
    fontWeight: 700,
  },
  navItemIcon: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    fontSize: "0.72rem",
    fontWeight: 800,
    background: themeStyles.panelAlt,
    color: themeStyles.muted,
  },
  navItemIconActive: {
    background: themeStyles.brand,
    color: "var(--surface-strong)",
  },
  navItemLabel: {
    color: "inherit",
    flex: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  navItemDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    background: themeStyles.brand,
  },
  sidebarPromo: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    color: "var(--surface-strong)",
    background: themeStyles.promoGradient,
    display: "grid",
    gap: 10,
  },
  sidebarPromoTag: {
    fontSize: "0.68rem",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    opacity: 0.84,
    fontWeight: 800,
  },
  sidebarPromoTitle: {
    margin: 0,
    fontSize: "1.02rem",
    lineHeight: 1.25,
  },
  sidebarPromoCopy: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.5,
    fontSize: "0.82rem",
  },
  sidebarPromoButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 8,
    background: themeStyles.panel,
    color: themeStyles.brandDeep,
    fontWeight: 800,
    fontSize: "0.82rem",
  },
  mainArea: {
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "56px minmax(0, 1fr)",
    height: "100vh",
  },
  topNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "0 24px",
    borderBottom: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
    position: "sticky",
    top: 0,
    zIndex: 3,
  },
  topNavSearch: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 8,
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panelAlt,
    color: themeStyles.muted,
    flex: "0 1 380px",
  },
  topNavSearchIcon: {
    fontSize: "0.9rem",
  },
  topNavSearchText: {
    fontSize: "0.84rem",
  },
  topNavRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  mainScroll: {
    overflowY: "auto",
    padding: "22px 24px 40px",
  },
  mainInner: {
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  },
  pageHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
  },
  pageEyebrow: {
    color: themeStyles.brand,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "0.7rem",
    marginBottom: 6,
  },
  pageTitle: {
    margin: 0,
    color: themeStyles.brandDeep,
    fontSize: "1.7rem",
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    fontWeight: 800,
  },
  pageSubtitle: {
    margin: "6px 0 0",
    maxWidth: 720,
    color: themeStyles.inkSoft,
    lineHeight: 1.55,
    fontSize: "0.92rem",
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
    gap: 10,
    flexWrap: "wrap",
  },
  accountAvatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: themeStyles.brandTint,
    color: themeStyles.brand,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: "0.82rem",
  },
  accountMeta: {
    display: "grid",
    gap: 0,
    textAlign: "left",
    color: themeStyles.brandDeep,
    fontSize: "0.82rem",
    lineHeight: 1.3,
  },
  mainContent: {
    display: "grid",
    gap: 16,
  },
  headerPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 999,
    background: themeStyles.brandTint,
    color: themeStyles.brand,
    fontWeight: 700,
    fontSize: "0.84rem",
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  statCard: {
    display: "grid",
    gap: 6,
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
  },
  statLabel: {
    color: themeStyles.muted,
    fontSize: "0.76rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statValue: {
    color: themeStyles.brandDeep,
    fontSize: "1.6rem",
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(300px, 0.9fr)",
    gap: 14,
  },
  heroPanel: {
    borderRadius: 14,
    background: themeStyles.heroGradient,
    color: "var(--surface-strong)",
    padding: "22px 24px",
    display: "grid",
    gap: 10,
  },
  heroTag: {
    display: "inline-flex",
    width: "fit-content",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "0.7rem",
  },
  heroHeading: {
    margin: 0,
    fontSize: "1.7rem",
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
    fontWeight: 800,
    maxWidth: 480,
  },
  heroCopy: {
    margin: 0,
    color: "rgba(255,255,255,0.84)",
    lineHeight: 1.6,
    fontSize: "0.9rem",
    maxWidth: 480,
  },
  heroActionRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },
  primaryActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "0 16px",
    borderRadius: 8,
    background: themeStyles.panel,
    color: themeStyles.brandDeep,
    fontWeight: 700,
    fontSize: "0.88rem",
  },
  secondaryActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "0 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.14)",
    color: "var(--surface-strong)",
    border: "1px solid rgba(255,255,255,0.22)",
    fontWeight: 700,
    fontSize: "0.88rem",
  },
  sideFeatureStack: {
    display: "grid",
    gap: 12,
  },
  searchModule: {
    borderRadius: 12,
    background: themeStyles.panel,
    padding: 16,
    border: `1px solid ${themeStyles.line}`,
    display: "grid",
    gap: 6,
    color: themeStyles.brandDeep,
    fontSize: "0.88rem",
  },
  tipCard: {
    borderRadius: 12,
    background: themeStyles.panel,
    padding: 16,
    border: `1px solid ${themeStyles.line}`,
    display: "grid",
    gap: 8,
    color: themeStyles.brandDeep,
    fontSize: "0.88rem",
  },
  tipTag: {
    width: "fit-content",
    padding: "5px 10px",
    borderRadius: 999,
    background: themeStyles.brandTint,
    color: themeStyles.brand,
    fontWeight: 700,
    fontSize: "0.72rem",
  },
  sectionBlock: {
    borderRadius: 14,
    background: themeStyles.panel,
    padding: 18,
    border: `1px solid ${themeStyles.line}`,
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    color: themeStyles.brandDeep,
    fontSize: "1.15rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    fontWeight: 800,
  },
  linkActionInline: {
    color: themeStyles.brand,
    fontWeight: 700,
    fontSize: "0.86rem",
  },
  serviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  serviceCard: {
    display: "grid",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panelSoft,
    fontSize: "0.88rem",
  },
  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: themeStyles.brandTint,
    color: themeStyles.brand,
    fontWeight: 900,
    fontSize: "0.9rem",
  },
  dashboardSplit: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(340px, 0.8fr)",
    gap: 16,
  },
  blogRow: {
    display: "grid",
    gridTemplateColumns: "160px minmax(0, 1fr)",
    gap: 18,
    alignItems: "center",
    padding: "16px 0",
    borderTop: `1px solid ${themeStyles.line}`,
  },
  blogVisual: {
    height: 96,
    borderRadius: 10,
    background: "linear-gradient(135deg, var(--brand-tint), var(--surface))",
    position: "relative",
    overflow: "hidden",
  },
  blogTag: {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    background: themeStyles.brandTint,
    color: themeStyles.brand,
    fontWeight: 800,
  },
  blogTitle: {
    margin: "10px 0 6px",
    color: themeStyles.brandDeep,
    fontSize: "1.1rem",
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
    fontWeight: 800,
  },
  blogDetail: {
    margin: 0,
    color: themeStyles.inkSoft,
    lineHeight: 1.7,
  },
  stackColumn: {
    display: "grid",
    gap: 16,
  },
  teleConsultCard: {
    borderRadius: 12,
    padding: 20,
    background: themeStyles.darkCardGradient,
    color: "var(--surface-strong)",
    display: "grid",
    gap: 14,
    
  },
  liveChip: {
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    background: themeStyles.success,
    color: "var(--surface-strong)",
    fontWeight: 800,
  },
  teleTitle: {
    margin: 0,
    fontSize: "1.3rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    fontWeight: 800,
  },
  teleCopy: {
    margin: 0,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.7,
  },
  dualPromoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  subscriptionTile: {
    borderRadius: 12,
    padding: 18,
    background: "linear-gradient(160deg, #3659ef, #4f6fff)",
    color: "var(--surface-strong)",
    display: "grid",
    gap: 10,
  },
  emergencyTile: {
    borderRadius: 12,
    padding: 18,
    background: "#e03131",
    color: "var(--surface-strong)",
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
    borderRadius: 14,
    padding: "18px 22px",
    background: "linear-gradient(140deg, #233776, #344ea4)",
    color: "var(--surface-strong)",
  },
  bluePill: {
    display: "inline-flex",
    padding: "5px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    color: "var(--surface-strong)",
    fontWeight: 700,
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  heroHeadingAlt: {
    margin: "10px 0 4px",
    fontSize: "1.4rem",
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
    fontWeight: 800,
    maxWidth: 560,
  },
  heroMetricRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },
  metricBadge: {
    display: "inline-flex",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    fontWeight: 700,
    fontSize: "0.8rem",
  },
  filtersGrid: {
    display: "grid",
    gap: 12,
  },
  searchInput: {
    width: "100%",
    minHeight: 42,
    borderRadius: 8,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    padding: "0 14px",
    fontSize: "0.9rem",
  },
  chipRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    minHeight: 32,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    color: "var(--ink-soft)",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
  },
  filterChipActive: {
    background: "var(--brand-tint)",
    color: "var(--brand)",
    borderColor: "var(--line-strong)",
  },
  doctorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  doctorCard: {
    display: "grid",
    gridTemplateColumns: "88px minmax(0, 1fr)",
    gap: 12,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    padding: 12,
    boxShadow: "0 10px 28px rgba(32,52,109,0.06)",
    alignItems: "center",
  },
  doctorAvatarPanel: {
    minHeight: 88,
    aspectRatio: "1 / 1",
    borderRadius: 14,
    background: "linear-gradient(135deg, #cbd8ff, var(--surface))",
    width: "100%",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    position: "relative",
    justifySelf: "start",
    alignSelf: "center",
    border: "1px solid var(--line)",
  },
  doctorAvatarImage: {
    objectPosition: "center top",
  },
  doctorAvatarFallback: {
    color: "#4164f6",
    fontSize: "1.85rem",
    fontWeight: 900,
    letterSpacing: "-0.06em",
  },
  doctorBody: {
    display: "grid",
    alignContent: "start",
    gap: 5,
  },
  doctorTopline: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  doctorName: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.15rem",
    lineHeight: 1.15,
    letterSpacing: "-0.04em",
  },
  verifiedBadge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "var(--accent-soft)",
    color: "var(--success)",
    fontWeight: 800,
    fontSize: "0.8rem",
  },
  doctorSpecialty: {
    color: "var(--brand)",
    fontWeight: 800,
    fontSize: "0.95rem",
  },
  doctorMeta: {
    margin: 0,
    color: "var(--ink-soft)",
    lineHeight: 1.45,
    fontSize: "0.94rem",
  },
  doctorFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 4,
    color: "var(--brand-deep)",
  },
  availableLabel: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "var(--accent-soft)",
    color: "var(--success)",
    fontWeight: 800,
    fontSize: "0.8rem",
  },
  detailHeroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
    gap: 16,
  },
  profileCard: {
    borderRadius: 12,
    padding: 18,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gridTemplateColumns: "144px minmax(0, 1fr) 128px",
    gap: 14,
    alignItems: "start",
  },
  profileImage: {
    height: 144,
    borderRadius: 10,
    background: "linear-gradient(135deg, #cbd8ff, var(--surface))",
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
    color: "var(--brand-deep)",
    fontSize: "1.5rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    fontWeight: 800,
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
    color: "var(--brand-deep)",
  },
  aboutCard: {
    borderRadius: 12,
    padding: 18,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 16,
  },
  infoStatGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  infoStatCard: {
    borderRadius: 10,
    padding: 14,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    display: "grid",
    gap: 8,
    color: "var(--ink-soft)",
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
    padding: 14,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    color: "var(--brand-deep)",
    cursor: "pointer",
  },
  planChoiceActive: {
    borderColor: "var(--brand)",
    background: "var(--brand-tint)",
  },
  planAmount: {
    fontWeight: 900,
    color: "var(--brand)",
  },
  checkoutBar: {
    position: "sticky",
    bottom: 18,
    zIndex: 2,
    borderRadius: 10,
    padding: 14,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid var(--line)",
    boxShadow: "0 18px 48px rgba(32,52,109,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  checkoutTitle: {
    display: "block",
    color: "var(--brand-deep)",
  },
  checkoutMeta: {
    display: "block",
    marginTop: 6,
    color: "var(--ink-soft)",
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
    gap: 16,
  },
  onlineMarker: {
    color: "var(--brand)",
    fontWeight: 800,
  },
  specialtyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  specialtyCard: {
    minHeight: 130,
    borderRadius: 12,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    color: "var(--brand-deep)",
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
    borderColor: "var(--brand)",
    background: "var(--brand-tint)",
    color: "var(--brand)",
  },
  specialtyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
  },
  textArea: {
    width: "100%",
    minHeight: 150,
    borderRadius: 10,
    border: "1px solid var(--line-strong)",
    background: "var(--surface-strong)",
    padding: 18,
    fontSize: "1rem",
    resize: "vertical",
  },
  noticeCard: {
    borderRadius: 10,
    padding: 16,
    background: "var(--brand-tint)",
    color: "var(--brand-deep)",
    border: "1px solid var(--line-strong)",
  },
  tabRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  tabButton: {
    minHeight: 48,
    padding: "0 18px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    color: "var(--ink-soft)",
    fontWeight: 800,
    cursor: "pointer",
  },
  tabButtonActive: {
    background: "var(--brand)",
    color: "var(--surface-strong)",
    borderColor: "var(--brand)",
  },
  emptyPanel: {
    borderRadius: 12,
    padding: 28,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    textAlign: "center",
    display: "grid",
    gap: 12,
    justifyItems: "center",
  },
  emptyTitle: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.3rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    fontWeight: 800,
  },
  emptyCopy: {
    margin: 0,
    color: "var(--ink-soft)",
  },
  appointmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  appointmentCard: {
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    padding: 14,
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 8,
    color: "var(--brand-deep)",
  },
  profileLayout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 16,
  },
  profileOverview: {
    borderRadius: 12,
    padding: 20,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 14,
    justifyItems: "center",
    alignContent: "center",
    textAlign: "center",
  },
  profileMonogram: {
    width: 100,
    height: 100,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "var(--brand-tint)",
    color: "var(--brand)",
    fontSize: "2rem",
    fontWeight: 900,
  },
  profileOverviewTitle: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.3rem",
    lineHeight: 1.2,
    letterSpacing: "-0.01em",
    fontWeight: 800,
  },
  profileOverviewCopy: {
    margin: 0,
    color: "var(--ink-soft)",
  },
  menuCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "18px 0",
    borderTop: "1px solid var(--line)",
    color: "var(--brand-deep)",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  productCard: {
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    padding: 14,
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 12,
  },
  productVisual: {
    height: 128,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
  },
  visualInitials: {
    color: "var(--brand)",
    fontSize: "2.4rem",
    fontWeight: 900,
    letterSpacing: "-0.06em",
  },
  productTitle: {
    color: "var(--brand-deep)",
    fontSize: "1.4rem",
    lineHeight: 1.15,
    letterSpacing: "-0.04em",
  },
  productMeta: {
    color: "var(--ink-soft)",
  },
  priceRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    color: "var(--brand-deep)",
  },
  stockText: {
    color: "var(--success)",
    fontWeight: 800,
  },
  quantityBox: {
    display: "inline-flex",
    alignItems: "center",
    gap: 18,
    width: "fit-content",
    minHeight: 50,
    padding: "0 18px",
    borderRadius: 10,
    border: "1px solid var(--line-strong)",
    color: "var(--brand-deep)",
    fontWeight: 800,
  },
  quantityButton: {
    border: "none",
    background: "transparent",
    color: "var(--brand)",
    fontSize: "1.8rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  pharmacyHero: {
    borderRadius: 12,
    padding: 18,
    background: "#2a45b8",
    color: "var(--surface-strong)",
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
    minHeight: 52,
    borderRadius: 10,
    background: "var(--surface-strong)",
    color: "var(--ink-soft)",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    fontWeight: 600,
  },
  cartLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) 320px",
    gap: 16,
    alignItems: "start",
  },
  cartLine: {
    display: "grid",
    gridTemplateColumns: "96px minmax(0, 1fr) auto",
    gap: 14,
    alignItems: "start",
    padding: "14px 0",
    borderTop: "1px solid var(--line)",
  },
  cartImage: {
    height: 88,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
  },
  cartContent: {
    display: "grid",
    gap: 8,
    color: "var(--brand-deep)",
  },
  removeButton: {
    border: "none",
    background: "transparent",
    color: "var(--ink-soft)",
    fontWeight: 800,
    cursor: "pointer",
  },
  summaryPanel: {
    borderRadius: 12,
    padding: 18,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
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
    color: "var(--ink-soft)",
  },
  summaryTotal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 18,
    marginTop: 6,
    borderTop: "1px solid var(--line)",
    color: "var(--brand-deep)",
    fontWeight: 900,
    fontSize: "1.5rem",
  },
  greenText: {
    color: "var(--success)",
  },
  strikeText: {
    textDecoration: "line-through",
    color: "#94a3b8",
  },
  orderGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  orderCard: {
    borderRadius: 10,
    padding: 14,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 8,
    color: "var(--brand-deep)",
  },
  callbackPanel: {
    width: "100%",
    maxWidth: 720,
    borderRadius: 12,
    padding: 24,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    textAlign: "center",
    display: "grid",
    gap: 18,
    justifyItems: "center",
  },
  serviceTileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  infoTileCard: {
    borderRadius: 10,
    padding: 14,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 8,
    color: "var(--brand-deep)",
  },
  tileVisual: {
    height: 120,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
  },
  staffVisual: {
    height: 120,
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "#f2f6ff",
  },
  tileTitle: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.18rem",
    lineHeight: 1.15,
    letterSpacing: "-0.04em",
  },
  serviceNameText: {
    color: "var(--brand-deep)",
    fontSize: "0.95rem",
    fontWeight: 800,
  },
  tileCopy: {
    margin: 0,
    color: "var(--ink-soft)",
    lineHeight: 1.5,
    fontSize: "0.92rem",
  },
  tileMetaGrid: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "var(--ink-soft)",
  },
  tileFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
    color: "var(--brand-deep)",
  },
  priceStack: {
    display: "grid",
    gap: 4,
    color: "var(--brand-deep)",
  },
  stackList: {
    display: "grid",
    gap: 12,
  },
  stepCard: {
    borderRadius: 10,
    padding: 14,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    display: "grid",
    gap: 8,
    color: "var(--brand-deep)",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  metricCard: {
    borderRadius: 10,
    padding: 16,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    display: "grid",
    gap: 10,
  },
  metricLabel: {
    color: "var(--ink-soft)",
    fontWeight: 700,
  },
  metricValue: {
    color: "var(--brand-deep)",
    fontSize: "1.6rem",
    lineHeight: 1,
    letterSpacing: "-0.02em",
  },
  planCardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },
  membershipCard: {
    borderRadius: 14,
    padding: 22,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    display: "grid",
    gap: 12,
    color: "var(--brand-deep)",
  },
  membershipPrice: {
    color: "var(--brand)",
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
    borderRadius: 10,
    padding: "16px 18px",
    background: "var(--brand-tint)",
    color: "var(--brand-deep)",
    fontWeight: 800,
  },
  formStack: {
    display: "grid",
    gap: 12,
  },
};