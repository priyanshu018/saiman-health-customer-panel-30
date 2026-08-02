"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useCustomerUser } from "@/components/customer-live";
import { SiteHeader } from "@/components/site-header";
import {
  fetchHomeBanners,
  fetchServiceCardSettings,
  subscribeHomeBanners,
  subscribeServiceCardSettings,
  trackBannerClick,
  type CmsBannerSummary,
  type ServiceCardSetting,
} from "@/lib/customer-site-cms";
import { subscriptionPlans } from "@/lib/customer-web-data";
import {
  cancelInstantCallRequest,
  cancelRentalOrder,
  createDoctorAppointment,
  createPharmacyOrder,
  createStaffingBooking,
  fetchDoctorSpecializations,
  fetchActiveInstantCallRequest,
  fetchApprovedCtmriServices,
  fetchApprovedDoctors,
  fetchApprovedHospitalServices,
  fetchApprovedLabTests,
  fetchApprovedPharmacyProducts,
  fetchApprovedRentalEquipment,
  fetchApprovedStaffingProviders,
  fetchCustomerProfile,
  fetchInstantCallHistory,
  fetchPatientAppointments,
  fetchPatientLabBookings,
  fetchPatientPharmacyOrders,
  fetchPatientProviderServiceBookings,
  fetchPatientRentalOrders,
  fetchPatientStaffingBookings,
  fetchSupportTickets,
  formatBookingStatus,
  loginCustomer,
  markInstantCallConnecting,
  requestInstantCall,
  requestRentalReturn,
  signupCustomer,
  STAFF_TYPES,
  STAFFING_DURATIONS,
  subscribeToInstantCallRequest,
  subscribeToPatientStaffingBookings,
  type AppointmentSummary,
  type CtmriServiceSummary,
  type CustomerProfileSummary,
  type DoctorSummary,
  type DoctorSpecializationSummary,
  type HospitalServiceSummary,
  type InstantCallSummary,
  type LabBookingSummary,
  type LabTestSummary,
  type PharmacyOrderSummary,
  type PharmacyProductSummary,
  type ProviderServiceBookingSummary,
  type RentalEquipmentSummary,
  type RentalOrderSummary,
  type StaffingBookingSummary,
  type StaffingProviderSummary,
} from "@/lib/customer-web-live";
import {
  addProductToCart,
  clearCart,
  decrementProduct,
  DEMO_PHARMACY_PRODUCTS,
  getCartLines,
  getCartSnapshot,
  mobileStoreKeys,
  registerPharmacyProducts,
  removeProduct,
  subscribeStore,
  type DemoPharmacyProduct,
} from "@/lib/mobile-web-state";
import { beginWebPayment, clearPendingPayment, fulfillServiceBooking, getPendingPayment, linkTransactionToEntity, verifyWebPayment } from "@/lib/web-payments";

function formatMoney(value: number) {
  const amount = Number(value) || 0;
  const hasFraction = Math.round(amount * 100) % 100 !== 0;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function formatExperience(years: number) {
  const clamped = Math.max(0, Math.round(Number(years) || 0));
  if (!clamped) return "Experience on file";
  return `${clamped}+ years experience`;
}

function formatDoctorRating(rating: number, reviewCount: number) {
  if (!reviewCount) return "New on Saiman";
  return `⭐ ${rating.toFixed(1)} (${reviewCount} review${reviewCount === 1 ? "" : "s"})`;
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

function DoctorCategoryIconMark({ iconKey }: { iconKey: string }) {
  const key = iconKey.trim().toLowerCase();
  const common = {
    viewBox: "0 0 24 24",
    width: 30,
    height: 30,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (key) {
    case "medical-services":
      return (
        <svg {...common}>
          <rect x="5" y="6" width="14" height="12" rx="2.5" />
          <path d="M9 6V4.8M15 6V4.8M12 9v6M9 12h6" />
        </svg>
      );
    case "favorite-border":
      return (
        <svg {...common}>
          <path d="M12 20.5s-6.5-4.3-8.6-8.2C1.8 9.2 3.2 5.5 7 5.5c2.1 0 3.4 1.2 5 3 1.6-1.8 2.9-3 5-3 3.8 0 5.2 3.7 3.6 6.8-2.1 3.9-8.6 8.2-8.6 8.2Z" />
        </svg>
      );
    case "face":
    case "face-retouching-natural":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M9.2 10.2h.01M14.8 10.2h.01" />
          <path d="M9.4 14.2c1 .9 4.2.9 5.2 0" />
        </svg>
      );
    case "person":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M6.5 18.5c1.8-3.4 9.2-3.4 11 0" />
        </svg>
      );
    case "self-improvement":
      return (
        <svg {...common}>
          <circle cx="12" cy="6.5" r="2.2" />
          <path d="M12 8.8v4.2" />
          <path d="M12 13l-3.4 4.9" />
          <path d="M12 13l3.4 4.9" />
          <path d="M8.3 10.6 12 12.7l3.7-2.1" />
        </svg>
      );
    case "pregnant-woman":
      return (
        <svg {...common}>
          <circle cx="12" cy="5.8" r="2.2" />
          <path d="M12 8.5v4.6" />
          <path d="M12 13.1c2 0 3.8 1.3 3.8 3.7" />
          <path d="M12 13.1c-1.6 0-2.8 1.4-2.8 3.1v2.3" />
          <path d="M12 18.5v-2.8" />
        </svg>
      );
    case "psychology":
      return (
        <svg {...common}>
          <path d="M12 4.5c-3.8 0-7 2.7-7 6.5 0 2.8 1.8 5.2 4.5 6.1v2.4l2.4-1.9h.1c3.8 0 7-2.7 7-6.6 0-3.8-3.2-6.5-7-6.5Z" />
          <path d="M10 9.3c.4-.9 2-.9 2.5 0 .4.8-.3 1.4-.9 1.8-.6.4-1 .8-1 1.6" />
          <path d="M12 15h.01" />
        </svg>
      );
    case "air":
      return (
        <svg {...common}>
          <path d="M4 10.5h10.5a2.5 2.5 0 1 0 0-5" />
          <path d="M6 14.5h12a2.5 2.5 0 1 1 0 5" />
          <path d="M3 18.5h7" />
        </svg>
      );
    case "healing":
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="3" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "hearing":
      return (
        <svg {...common}>
          <path d="M15.8 9.3a3.8 3.8 0 1 0-7.6 0c0 2 1.2 2.8 2.2 3.5.9.6 1.6 1.1 1.6 2.2" />
          <path d="M12 18.2a1.8 1.8 0 0 1-3.6 0" />
          <path d="M16.5 5.8a7 7 0 0 1 0 9.9" />
        </svg>
      );
    case "visibility":
      return (
        <svg {...common}>
          <path d="M2.8 12s3.4-5.6 9.2-5.6 9.2 5.6 9.2 5.6-3.4 5.6-9.2 5.6S2.8 12 2.8 12Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "vaccines":
      return (
        <svg {...common}>
          <path d="m8.5 7.5 8 8" />
          <path d="m14.2 5.8 4 4" />
          <path d="m7.2 8.8 2.2-2.2" />
          <path d="m15.2 12.2-5.6 5.6" />
          <path d="M6.8 17.8h4.4" />
          <path d="M6 20h6" />
        </svg>
      );
    case "biotech":
      return (
        <svg {...common}>
          <path d="M9 4.8v5.1l-3 5.6a2.7 2.7 0 0 0 2.4 4h7.2a2.7 2.7 0 0 0 2.4-4l-3-5.6V4.8" />
          <path d="M8 8h8" />
          <path d="M9.2 13.2h5.6" />
          <path d="M10.3 16h3.4" />
        </svg>
      );
    case "water-drop":
      return (
        <svg {...common}>
          <path d="M12 4.5s5.2 5.7 5.2 9.3a5.2 5.2 0 1 1-10.4 0C6.8 10.2 12 4.5 12 4.5Z" />
        </svg>
      );
    case "science":
      return (
        <svg {...common}>
          <path d="M10 4.8v4.4l-4 6.4A2.6 2.6 0 0 0 8.2 19h7.6a2.6 2.6 0 0 0 2.2-3.4l-4-6.4V4.8" />
          <path d="M9 9.8h6" />
          <path d="M8.8 14.2h6.4" />
        </svg>
      );
    case "monitor-heart":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="10.5" rx="2.2" />
          <path d="M8 12h2l1.5-2.4 2.2 4 1.3-2H17" />
          <path d="M10 19.2h4" />
        </svg>
      );
    case "emergency":
      return (
        <svg {...common}>
          <path d="M12 4.8 5.2 18.5h13.6L12 4.8Z" />
          <path d="M12 9.2v4.3" />
          <path d="M12 16.2h.01" />
        </svg>
      );
    case "child-care":
      return (
        <svg {...common}>
          <circle cx="9" cy="8.2" r="2.2" />
          <circle cx="15" cy="8.2" r="2.2" />
          <path d="M8.2 14.2c.8 1.5 2 2.3 3.8 2.3s3-.8 3.8-2.3" />
          <path d="M7.4 12c1.2-.9 2.4-1.3 4.6-1.3s3.4.4 4.6 1.3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="5" y="6" width="14" height="12" rx="2.5" />
          <path d="M12 9v6M9 12h6" />
        </svg>
      );
  }
}

function FilterSelectField(props: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const { ariaLabel, value, onChange, children } = props;

  return (
    <div className="hover-lift" style={styles.filterSelectWrap}>
      <select
        aria-label={ariaLabel}
        style={styles.filterSelect}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <span aria-hidden="true" style={styles.filterSelectChevron}>▾</span>
    </div>
  );
}

const EMPTY_CART_SNAPSHOT = {
  lines: [] as Array<{ product: DemoPharmacyProduct; quantity: number }>,
  itemCount: 0,
  mrp: 0,
  total: 0,
  saved: 0,
};

let lastCartKey = "";
let lastCartValue = EMPTY_CART_SNAPSHOT;

function getStableCartSnapshot() {
  const key = JSON.stringify(getCartLines());
  if (key === lastCartKey) return lastCartValue;
  lastCartKey = key;
  lastCartValue = getCartSnapshot();
  return lastCartValue;
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

type HomeServiceCard = {
  id: string;
  title: string;
  href: string;
  imageSrc: string;
  searchTerms: string[];
};

const HOME_SERVICE_CARDS: HomeServiceCard[] = [
  {
    id: "doctor-consult",
    title: "Doctor Consult",
    href: "/doctors",
    imageSrc: "/home-service-doctor.png",
    searchTerms: ["doctor", "consult", "consultation", "physician"],
  },
  {
    id: "pharmacy",
    title: "Pharmacy",
    href: "/pharmacy",
    imageSrc: "/home-service-pharmacy.png",
    searchTerms: ["pharmacy", "medicine", "medicines", "tablet"],
  },
  {
    id: "lab-tests",
    title: "Lab Tests",
    href: "/lab-tests",
    imageSrc: "/home-service-lab.png",
    searchTerms: ["lab", "tests", "blood test", "pathology"],
  },
  {
    id: "ct-mri",
    title: "CT / MRI",
    href: "/ct-mri",
    imageSrc: "/home-service-ctmri.png",
    searchTerms: ["ct", "mri", "scan", "xray", "ultrasound"],
  },
  {
    id: "ambulance",
    title: "Ambulance",
    href: "/ambulance",
    imageSrc: "/home-service-ambulance.png",
    searchTerms: ["ambulance", "emergency"],
  },
  {
    id: "rental",
    title: "Rental Equipment",
    href: "/rental-equipment",
    imageSrc: "/home-service-rental.png",
    searchTerms: ["rental", "equipment", "wheelchair", "hospital bed"],
  },
  {
    id: "hospitals",
    title: "Hospitals & Surgeries",
    href: "/hospitals",
    imageSrc: "/home-service-hospital.png",
    searchTerms: ["hospital", "hospitals", "surgery", "surgeries"],
  },
  {
    id: "health-card",
    title: "Health Card",
    href: "/health-card",
    imageSrc: "/home-service-health-card.png",
    searchTerms: ["health card", "membership", "card"],
  },
  {
    id: "staffing",
    title: "Care Staff",
    href: "/care-staff",
    imageSrc: "/home-service-staffing.png",
    searchTerms: ["care staff", "staffing", "nurse", "caregiver"],
  },
];

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
    <div className="hover-lift" style={styles.infoTileCard}>
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
    <div className="hover-lift" style={styles.doctorCard}>
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
    <div className="responsive-grid-2col" style={styles.doctorGrid}>
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
          <label style={styles.fieldLabel} htmlFor="auth-name">Full name</label>
          <input id="auth-name" style={styles.fieldInput} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" required />
          <label style={styles.fieldLabel} htmlFor="auth-phone">Phone number</label>
          <input id="auth-phone" style={styles.fieldInput} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" required />
        </>
      ) : null}
      <label style={styles.fieldLabel} htmlFor="auth-email">Email address</label>
      <input id="auth-email" style={styles.fieldInput} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
      <label style={styles.fieldLabel} htmlFor="auth-password">Password</label>
      <input id="auth-password" style={styles.fieldInput} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
      {mode === "signup" ? (
        <>
          <label style={styles.fieldLabel} htmlFor="auth-confirm-password">Confirm password</label>
          <input
            id="auth-confirm-password"
            style={styles.fieldInput}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </>
      ) : null}
      {error ? <div style={styles.errorNote}>{error}</div> : null}
      <button type="submit" className="primary-action-btn" style={styles.primaryAction} disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Sign In as Patient" : "Create Account"}
      </button>
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
      <div className="responsive-grid-standard" style={styles.authGrid}>
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
      title="Sign in to manage your appointments, orders, and care records."
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
      subtitle="Set up your patient profile once to book doctors, order medicines, and manage every visit from one dashboard."
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
  return (
    <div className="app-shell">
      <SiteHeader mode="portal" />

      <div style={styles.mainArea}>
        <main style={styles.mainScroll}>
          <div style={styles.mainInner}>
            <div style={styles.pageHeaderRow}>
              <div>
                <h1 style={styles.pageTitle}>{title}</h1>
                <p style={styles.pageSubtitle}>{subtitle}</p>
              </div>
              {accent ? <div>{accent}</div> : null}
            </div>
            <section style={styles.mainContent}>{children}</section>
          </div>
        </main>
      </div>
    </div>
  );
}

export function WebHomeScreen() {
  const router = useRouter();
  const { user } = useCustomerUser();
  const cart = useCart();
  const [upcomingAppointments, setUpcomingAppointments] = useState(0);
  const [pharmacyOrders, setPharmacyOrders] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [homeQuery, setHomeQuery] = useState("");
  const [homeBanners, setHomeBanners] = useState<CmsBannerSummary[]>([]);
  const [activeHomeBannerIndex, setActiveHomeBannerIndex] = useState(0);
  const [serviceSettings, setServiceSettings] = useState<ServiceCardSetting[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchPatientAppointments(user.id)
      .then((items: AppointmentSummary[]) =>
        setUpcomingAppointments(items.filter((item) => !["completed", "cancelled"].includes(item.status.toLowerCase())).length),
      )
      .catch(() => setUpcomingAppointments(0));
    fetchPatientPharmacyOrders(user.id)
      .then((items) => setPharmacyOrders(items.length))
      .catch(() => setPharmacyOrders(0));
    fetchSupportTickets(user.id)
      .then((items) => setOpenTickets(items.filter((item) => !["resolved", "closed"].includes(item.status.toLowerCase())).length))
      .catch(() => setOpenTickets(0));
  }, [user]);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchServiceCardSettings().catch(() => [] as ServiceCardSetting[]),
      fetchHomeBanners("Home Banner").catch(() => [] as CmsBannerSummary[]),
    ]).then(([settings, banners]) => {
      if (!active) return;
      setServiceSettings(settings);
      setHomeBanners(banners);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeServiceCardSettings(setServiceSettings), []);
  useEffect(() => subscribeHomeBanners(setHomeBanners, "Home Banner"), []);

  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveHomeBannerIndex((current) => (current + 1) % homeBanners.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [homeBanners.length]);

  const serviceSettingsById = useMemo(
    () => new Map(serviceSettings.map((setting) => [setting.id, setting])),
    [serviceSettings],
  );

  const services = useMemo(
    () =>
      HOME_SERVICE_CARDS.map((service) => {
        const setting = serviceSettingsById.get(service.id);
        return {
          ...service,
          visible: setting?.visible ?? true,
          restricted: setting?.functional === false,
        };
      }).filter((service) => service.visible),
    [serviceSettingsById],
  );

  const filteredServices = useMemo(() => {
    const query = homeQuery.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) =>
      [service.title, ...service.searchTerms].some((value) => value.toLowerCase().includes(query)),
    );
  }, [homeQuery, services]);

  const normalizedHomeBannerIndex = homeBanners.length ? activeHomeBannerIndex % homeBanners.length : 0;
  const activeBanner = homeBanners[normalizedHomeBannerIndex] ?? null;
  const primaryServiceHref = services.find((service) => !service.restricted)?.href ?? "/support";

  const overviewStats = [
    { label: "Upcoming appointments", value: String(upcomingAppointments), href: "/appointments" },
    { label: "Cart items", value: String(cart.itemCount), href: "/pharmacy/cart" },
    { label: "Pharmacy orders", value: String(pharmacyOrders), href: "/pharmacy/orders" },
    { label: "Open support tickets", value: String(openTickets), href: "/support" },
  ];

  function handleHomeSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(homeQuery.trim() ? `/doctors?q=${encodeURIComponent(homeQuery.trim())}` : "/doctors");
  }

  function handleBannerClick() {
    if (activeBanner?.id) {
      void trackBannerClick(activeBanner.id).catch(() => undefined);
    }
    router.push(primaryServiceHref);
  }

  return (
    <DashboardFrame
      title={`Good morning, ${user?.name || "Customer"}!`}
      subtitle="Discover verified doctors, order medicines, book diagnostics, and manage every appointment from one place."
      accent={cart.itemCount ? <Link href="/pharmacy/cart" style={styles.headerPill}>Cart · {cart.itemCount}</Link> : undefined}
    >
      <div style={styles.statRow}>
        {overviewStats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="hover-lift" style={styles.statCard}>
            <span style={styles.statLabel}>{stat.label}</span>
            <strong style={styles.statValue}>{stat.value}</strong>
          </Link>
        ))}
      </div>

      <form style={styles.mobileHomeSearchCard} onSubmit={handleHomeSearch}>
        <label style={styles.mobileHomeSearchLabel} htmlFor="home-service-search">
          Search doctors, tests, medicines, and more
        </label>
        <div style={styles.mobileHomeSearchRow}>
          <input
            id="home-service-search"
            style={{ ...styles.fieldInput, ...styles.mobileHomeSearchInput }}
            value={homeQuery}
            onChange={(event) => setHomeQuery(event.target.value)}
            aria-label="Search doctors, tests, or services"
            placeholder="Search doctors, tests, medicines..."
          />
          <button type="submit" style={styles.mobileHomeSearchButton}>
            Search
          </button>
        </div>
      </form>

      <section style={styles.mobileHomeBannerSection}>
        <button type="button" style={styles.mobileHomeBannerCard} onClick={handleBannerClick}>
          {activeBanner?.image_url ? (
            <Image
              src={activeBanner.image_url}
              alt={activeBanner.title || "Home banner"}
              fill
              sizes="(max-width: 960px) 100vw, 1120px"
              style={{ objectFit: "cover" }}
            />
          ) : null}
          <div style={styles.mobileHomeBannerOverlay} />
          <div style={styles.mobileHomeBannerGlow} />
          <div style={styles.mobileHomeBannerContent}>
            <span style={styles.mobileHomeBannerTag}>Limited Time</span>
            <h2 style={styles.mobileHomeBannerTitle}>{activeBanner?.title || "No active banner"}</h2>
            <p style={styles.mobileHomeBannerCopy}>
              {activeBanner?.description || "Add an active home banner in admin to show it here."}
            </p>
            <div style={styles.mobileHomeBannerAction}>
              <span>Book Now</span>
              <span aria-hidden="true">→</span>
            </div>
          </div>
        </button>
        {homeBanners.length > 1 ? (
          <div style={styles.mobileHomeBannerDots}>
            {homeBanners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveHomeBannerIndex(index)}
                style={{
                  ...styles.mobileHomeBannerDot,
                  ...(index === normalizedHomeBannerIndex ? styles.mobileHomeBannerDotActive : {}),
                }}
                aria-label={`Show banner ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Our Services</h2>
          <Link href="/support" style={styles.linkActionInline}>Need help?</Link>
        </div>
        <div style={styles.mobileHomeServicesShell}>
          <div style={styles.mobileHomeServicesGrid}>
            {filteredServices.map((service) =>
              service.restricted ? (
                <button key={service.id} type="button" style={styles.mobileHomeServiceCardRestricted}>
                  <div style={styles.mobileHomeServiceImageWrap}>
                    <Image
                      src={service.imageSrc}
                      alt={service.title}
                      width={92}
                      height={92}
                      style={styles.mobileHomeServiceImage}
                    />
                  </div>
                  <strong style={styles.mobileHomeServiceTitle}>{service.title}</strong>
                  <span style={styles.mobileHomeServiceBadge}>Restricted</span>
                </button>
              ) : (
                <Link key={service.id} href={service.href} className="hover-lift" style={styles.mobileHomeServiceCard}>
                  <div style={styles.mobileHomeServiceImageWrap}>
                    <Image
                      src={service.imageSrc}
                      alt={service.title}
                      width={92}
                      height={92}
                      style={styles.mobileHomeServiceImage}
                    />
                  </div>
                  <strong style={styles.mobileHomeServiceTitle}>{service.title}</strong>
                </Link>
              ),
            )}
          </div>
          {!filteredServices.length ? (
            <div style={styles.noticeCard}>
              No services match this search right now. Try doctor, lab, pharmacy, or ambulance.
            </div>
          ) : null}
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
            <p style={styles.teleCopy}>Talk to an online doctor right away for urgent, non-emergency guidance.</p>
            <Link href="/instant-call" style={styles.primaryActionLink}>Start Call</Link>
          </div>
          <div className="responsive-grid-2col" style={styles.dualPromoGrid}>
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
  const [categories, setCategories] = useState<DoctorSpecializationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [experienceFilter, setExperienceFilter] = useState<"All" | "0-5" | "5-10" | "10+">("All");
  const [feeFilter, setFeeFilter] = useState<"All" | "0-500" | "501-1000" | "1000+">("All");
  const [availabilityFilter, setAvailabilityFilter] = useState<"All" | "Clinic" | "Video" | "Voice" | "Chat">("All");

  useEffect(() => {
    fetchApprovedDoctors()
      .then((items) => setDoctors(items))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;

    fetchDoctorSpecializations()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch(() => {
        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const categoryOptions = useMemo(
    () => [{ id: "all", name: "All", description: null, iconKey: "medical-services", isActive: true }, ...categories],
    [categories],
  );

  const filtered = useMemo(
    () =>
      doctors.filter((doctor) => {
        const matchesSpecialty = specialty === "All" || doctor.specialty.trim().toLowerCase() === specialty.trim().toLowerCase();
        const haystack = `${doctor.name} ${doctor.specialty} ${doctor.hospital} ${doctor.city}`.toLowerCase();
        const matchesQuery = haystack.includes(query.toLowerCase());

        const matchesExperience =
          experienceFilter === "All" ||
          (experienceFilter === "0-5" && doctor.experience >= 0 && doctor.experience <= 5) ||
          (experienceFilter === "5-10" && doctor.experience > 5 && doctor.experience <= 10) ||
          (experienceFilter === "10+" && doctor.experience > 10);

        const matchesFee =
          feeFilter === "All" ||
          (feeFilter === "0-500" && doctor.fee <= 500) ||
          (feeFilter === "501-1000" && doctor.fee > 500 && doctor.fee <= 1000) ||
          (feeFilter === "1000+" && doctor.fee > 1000);

        const matchesAvailability =
          availabilityFilter === "All" ||
          doctor.availability.some((item) => item.toLowerCase() === availabilityFilter.toLowerCase());

        return matchesSpecialty && matchesQuery && matchesExperience && matchesFee && matchesAvailability;
      }),
    [availabilityFilter, doctors, experienceFilter, feeFilter, specialty, query],
  );

  function resetDoctorFilters() {
    setSpecialty("All");
    setExperienceFilter("All");
    setFeeFilter("All");
    setAvailabilityFilter("All");
    setQuery("");
  }

  return (
    <DashboardFrame title="Doctor Consultation" subtitle="Find verified specialists, compare consultation fees, and book an appointment that fits your schedule.">
      <section style={styles.heroWideCard}>
        <div>
          <span style={styles.bluePill}>Verified Doctors</span>
          <h2 style={styles.heroHeadingAlt}>Consult trusted specialists with clear pricing.</h2>
          <div style={styles.heroMetricRow}>
            <span style={styles.metricBadge}>{doctors.length > 0 ? `${doctors.length}+ verified doctors` : "Verified doctors"}</span>
            <span style={styles.metricBadge}>Flexible scheduling</span>
            <span style={styles.metricBadge}>Secure payments</span>
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.filtersGrid}>
          <input
            style={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search doctors, specialties, hospital"
            placeholder="Search doctors, specialties, hospital..."
          />
          <div style={styles.categoryScroller}>
            {categoryOptions.slice(0, 8).map((item) => (
              <button
                type="button"
                key={item.id}
                className="hover-lift"
                style={{ ...styles.categoryCard, ...(specialty === item.name ? styles.categoryCardActive : {}) }}
                onClick={() => setSpecialty(item.name)}
              >
                <span style={{ ...styles.categoryIconWrap, ...(specialty === item.name ? styles.categoryIconWrapActive : {}) }}>
                  <span style={styles.categoryIconGlyph}>
                    <DoctorCategoryIconMark iconKey={item.iconKey} />
                  </span>
                </span>
                <span style={{ ...styles.categoryLabel, ...(specialty === item.name ? styles.categoryLabelActive : {}) }}>{item.name}</span>
              </button>
            ))}
          </div>
          <div style={styles.filterToolbar}>
            <button type="button" className="hover-lift" style={styles.filterButton} onClick={resetDoctorFilters}>
              <span style={styles.filterButtonGlyph}>☰</span>
              <span>Filter</span>
            </button>
            <div style={styles.filterToolbarChips}>
              <FilterSelectField
                ariaLabel="Filter by experience"
                value={experienceFilter}
                onChange={(value) => setExperienceFilter(value as "All" | "0-5" | "5-10" | "10+")}
              >
                <option value="All">Experience</option>
                <option value="0-5">0-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </FilterSelectField>
              <FilterSelectField
                ariaLabel="Filter by fees"
                value={feeFilter}
                onChange={(value) => setFeeFilter(value as "All" | "0-500" | "501-1000" | "1000+")}
              >
                <option value="All">Fees</option>
                <option value="0-500">Up to ₹500</option>
                <option value="501-1000">₹501-₹1000</option>
                <option value="1000+">₹1000+</option>
              </FilterSelectField>
              <FilterSelectField
                ariaLabel="Filter by availability"
                value={availabilityFilter}
                onChange={(value) => setAvailabilityFilter(value as "All" | "Clinic" | "Video" | "Voice" | "Chat")}
              >
                <option value="All">Availability</option>
                <option value="Clinic">Clinic</option>
                <option value="Video">Video</option>
                <option value="Voice">Voice</option>
                <option value="Chat">Chat</option>
              </FilterSelectField>
            </div>
          </div>
        </div>
      </section>

      {loading ? <DoctorGridSkeleton /> : null}
      {!loading && loadError ? <div style={styles.noticeCard}>Unable to load doctors right now. Please refresh the page.</div> : null}

          <div className="responsive-grid-2col" style={styles.doctorGrid}>
        {loading ? null : filtered.map((doctor) => (
          <Link key={doctor.id} href={`/doctors/${doctor.id}`} className="hover-lift" style={styles.doctorCard}>
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
              <p style={styles.doctorMeta}>
                {formatExperience(doctor.experience)} · {formatDoctorRating(doctor.rating, doctor.reviewCount)}
              </p>
              <div style={styles.doctorFooter}>
                <strong>{doctor.fee > 0 ? formatMoney(doctor.fee) : "Fee on request"}</strong>
                <span style={styles.availableLabel}>{doctor.availability[0] || "Verified profile"}</span>
              </div>
              <div style={styles.doctorCardAction}>Book Appointment</div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

const APPOINTMENT_TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function WebDoctorDetailScreen({ doctorId }: { doctorId: string }) {
  const { requireAuth } = useAuthActionGuard();
  const [doctor, setDoctor] = useState<DoctorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"single" | "monthly" | "yearly">("single");
  const [submitting, setSubmitting] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState(todayIsoDate);
  const [appointmentTime, setAppointmentTime] = useState(APPOINTMENT_TIME_SLOTS[0]);
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    fetchApprovedDoctors()
      .then((items) => setDoctor(items.find((item) => item.id === doctorId) || null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [doctorId]);

  async function handleContinue() {
    if (!doctor) return;
    const user = requireAuth(`/doctors/${doctor.id}`);
    if (!user) return;

    const fee = selectedPlan === "monthly" ? doctor.fee * 3 : selectedPlan === "yearly" ? doctor.fee * 10 : doctor.fee;
    setSubmitting(true);
    setPaymentError("");

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
          appointmentDate,
          appointmentTime,
        },
        payment: {
          serviceType: "doctor_consultation",
          serviceLabel: doctor.name,
          description: `Consultation with ${doctor.name}`,
          amount: fee,
          paymentMethod: "upi",
          providerId: doctor.id,
          providerName: doctor.name,
          bookingRef: { kind: "doctor_consultation", doctorId: doctor.id, plan: selectedPlan },
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
      setPaymentError(error instanceof Error ? error.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  return (
    <DashboardFrame title="Doctor Profile" subtitle="Review doctor details, choose a consultation plan, and book securely.">
      {loading ? <div style={styles.noticeCard}>Loading doctor profile...</div> : null}
      {!loading && !doctor ? (
        <div style={styles.noticeCard}>{loadError ? "Unable to load this doctor right now. Please refresh the page." : "This doctor could not be found."}</div>
      ) : null}
      {doctor ? (
        <>
          <section className="responsive-grid-detail" style={styles.detailHeroGrid}>
            <div className="responsive-profile-card" style={styles.profileCard}>
              <DoctorImage doctor={doctor} style={styles.profileImage} textStyle={styles.profileImageFallback} />
              <div style={styles.profileInfo}>
                <div style={styles.doctorTopline}>
                  <h2 style={styles.profileName}>{doctor.name}</h2>
                  <span style={styles.verifiedBadge}>Verified</span>
                </div>
                <div style={styles.doctorSpecialty}>{doctor.specialty}</div>
                <p style={styles.doctorMeta}>Verified medical practitioner</p>
                <div style={styles.profileStats}>
                  <span style={styles.metricBadge}>{formatDoctorRating(doctor.rating, doctor.reviewCount)}</span>
                  <span style={styles.metricBadge}>{formatExperience(doctor.experience)}</span>
                  <span style={styles.metricBadge}>{doctor.hospital}</span>
                </div>
              </div>
              <div style={styles.priceAside}>
                <strong>{doctor.fee > 0 ? formatMoney(doctor.fee) : "On request"}</strong>
                <span>{doctor.fee > 0 ? "Starts from" : "Contact support"}</span>
              </div>
            </div>
            <div style={styles.aboutCard}>
              <h3 style={styles.sectionTitle}>About Doctor</h3>
              <p style={styles.blogDetail}>
                {doctor.name} is a verified practitioner on Saiman Healthcare, available for appointments through our doctor network.
              </p>
              <div className="responsive-grid-2col" style={styles.infoStatGrid}>
                <div style={styles.infoStatCard}>
                  <strong>Consultation Mode</strong>
                  <span>{doctor.availability.join(", ")}</span>
                </div>
                <div style={styles.infoStatCard}>
                  <strong>Hospital</strong>
                  <span>{doctor.hospital}</span>
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
                  <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
                    <strong>{plan.label}</strong>
                    <span>{plan.sub}</span>
                  </div>
                  <div style={styles.planAmount}>{formatMoney(plan.amount)}</div>
                </button>
              ))}
            </div>
          </section>

          <section style={styles.sectionBlock}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Choose Date &amp; Time</h2>
            </div>
            <div style={styles.formStack}>
              <label style={styles.fieldLabel}>Appointment date</label>
              <input
                type="date"
                style={styles.fieldInput}
                value={appointmentDate}
                min={todayIsoDate()}
                onChange={(event) => setAppointmentDate(event.target.value)}
              />
              <label style={styles.fieldLabel}>Appointment time</label>
              <select style={styles.fieldInput} value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)}>
                {APPOINTMENT_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {paymentError ? <div style={styles.errorNote}>{paymentError}</div> : null}

          <section style={styles.checkoutBar}>
            <div>
              <strong style={styles.checkoutTitle}>
                {selectedPlan === "single" ? "Single Consultation" : selectedPlan === "monthly" ? "Monthly Plan" : "Yearly Plan"}
              </strong>
              <span style={styles.checkoutMeta}>{formatDateTimeLabel(appointmentDate, appointmentTime)}</span>
            </div>
            <button onClick={handleContinue} className="primary-action-btn" style={styles.primaryAction} disabled={submitting}>
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

const INSTANT_CALL_SPECIALTIES = [
  "Cardiologist",
  "Dermatologist",
  "Endocrinologist",
  "ENT Specialist",
  "General Physician",
  "Gynaecologist",
  "Neurologist",
  "Orthopaedic",
];

function instantCallPhaseCopy(status: string): { title: string; detail: string } {
  switch (status) {
    case "pending":
      return { title: "Searching for an available doctor...", detail: "We are matching your request with an online specialist. This usually takes under a minute." };
    case "assigned":
      return { title: "A doctor has been assigned", detail: "Your request is being reviewed by the assigned doctor." };
    case "doctor_accepted":
      return { title: "Doctor accepted your request", detail: "You can join the call now." };
    case "connecting":
      return { title: "Connecting your call", detail: "Live voice and video calling is available in the Saiman Healthcare mobile app. This page will keep showing your live call status." };
    case "in_progress":
      return { title: "Consultation in progress", detail: "Your call is currently active." };
    default:
      return { title: "Request update", detail: "" };
  }
}

export function WebInstantCallScreen() {
  const { user, state: authState, requireAuth } = useAuthActionGuard();
  const [specialty, setSpecialty] = useState("General Physician");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [activeRequest, setActiveRequest] = useState<InstantCallSummary | null>(null);
  const [history, setHistory] = useState<InstantCallSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const loading = authState.loading || (Boolean(user) && dataLoading);

  useEffect(() => {
    if (!user) return;
    let active = true;

    function refresh() {
      fetchActiveInstantCallRequest(user!.id)
        .then((value) => {
          if (active) setActiveRequest(value);
        })
        .catch(() => {
          if (active) setActiveRequest(null);
        })
        .finally(() => {
          if (active) setDataLoading(false);
        });
      fetchInstantCallHistory(user!.id)
        .then((items) => {
          if (active) setHistory(items);
        })
        .catch(() => undefined);
    }

    refresh();
    const unsubscribe = subscribeToInstantCallRequest(user.id, refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

  async function submit() {
    setError("");
    const authUser = requireAuth("/instant-call");
    if (!authUser) return;
    if (!reason.trim()) {
      setError("Tell us the reason for this call.");
      return;
    }
    setSubmitting(true);
    try {
      await requestInstantCall({
        specialty,
        callReason: reason,
        notes,
        preferredLanguage: "English",
      });
      const next = await fetchActiveInstantCallRequest(authUser.id);
      setActiveRequest(next);
      setReason("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request an instant call.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    if (!activeRequest) return;
    setJoining(true);
    try {
      await markInstantCallConnecting(activeRequest.id, "voice");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect this call.");
    } finally {
      setJoining(false);
    }
  }

  async function handleCancel() {
    if (!activeRequest) return;
    setCancelling(true);
    try {
      await cancelInstantCallRequest(activeRequest.id, "Cancelled by patient from the customer web app.");
      setActiveRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel this request.");
    } finally {
      setCancelling(false);
    }
  }

  const canJoin = activeRequest ? ["doctor_accepted", "connecting"].includes(activeRequest.status) : false;
  const canCancel = activeRequest ? !["in_progress"].includes(activeRequest.status) : false;

  return (
    <DashboardFrame title="Instant Doctor Call" subtitle="Connect with an online doctor right away for urgent, non-emergency medical guidance.">
      {error ? <div style={styles.errorNote}>{error}</div> : null}

      {loading ? <div style={styles.noticeCard}>Loading instant call status...</div> : null}

      {!loading && activeRequest ? (
        <section style={styles.heroWideCard}>
          <span style={styles.bluePill}>{activeRequest.specialty}</span>
          <h2 style={styles.heroHeadingAlt}>{instantCallPhaseCopy(activeRequest.status).title}</h2>
          <p style={styles.heroCopy}>{instantCallPhaseCopy(activeRequest.status).detail}</p>
          {activeRequest.doctorName ? <p style={styles.heroCopy}>Doctor: {activeRequest.doctorName}</p> : null}
          <div style={styles.heroActionRow}>
            {canJoin ? (
              <button onClick={handleJoin} className="primary-action-btn" style={styles.primaryAction} disabled={joining || activeRequest.status === "connecting"}>
                {activeRequest.status === "connecting" ? "Connecting..." : joining ? "Joining..." : "Join Call"}
              </button>
            ) : null}
            {canCancel ? (
              <button onClick={handleCancel} style={styles.secondaryActionLink} disabled={cancelling}>
                {cancelling ? "Cancelling..." : "Cancel Request"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {!loading && !activeRequest ? (
        <div className="responsive-grid-standard" style={styles.twoColumnGrid}>
          <section style={styles.sectionBlock}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Choose a specialty</h2>
            </div>
            <div className="responsive-grid-3col" style={styles.specialtyGrid}>
              {INSTANT_CALL_SPECIALTIES.map((item) => (
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
            <label style={styles.fieldLabel}>Reason for this call</label>
            <input style={styles.fieldInput} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Describe why you need to speak with a doctor" />
            <label style={styles.fieldLabel}>Symptoms or notes (optional)</label>
            <textarea style={styles.textArea} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Any symptoms or context that will help the doctor" />
            <button onClick={submit} className="primary-action-btn" style={{ ...styles.primaryAction, marginTop: 18 }} disabled={submitting}>
              {submitting ? "Requesting..." : "Request Instant Call"}
            </button>
          </section>
        </div>
      ) : null}

      {history.length ? (
        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Recent Requests</h2>
          </div>
          <div style={styles.appointmentGrid}>
            {history.map((item) => (
              <div key={item.id} className="hover-lift" style={styles.appointmentCard}>
                <strong>{item.specialty}</strong>
                <span>{item.callReason || "Instant call request"}</span>
                <small>{formatDate(item.createdAt)}</small>
                <div style={styles.doctorFooter}>
                  <span>{item.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </DashboardFrame>
  );
}

export function WebAppointmentsScreen() {
  const { user } = useCustomerUser();
  const [liveAppointments, setLiveAppointments] = useState<AppointmentSummary[]>([]);
  const [tab, setTab] = useState<"upcoming" | "completed" | "cancelled">("upcoming");

  useEffect(() => {
    if (!user) return;
    fetchPatientAppointments(user.id).then(setLiveAppointments).catch(() => setLiveAppointments([]));
  }, [user]);

  const merged = useMemo(
    () =>
      liveAppointments.map((item) => ({
        ...item,
        status: ["completed", "cancelled"].includes(item.status.toLowerCase()) ? item.status.toLowerCase() : "upcoming",
      })),
    [liveAppointments],
  );

  const filtered = useMemo(() => merged.filter((item) => item.status === tab), [merged, tab]);

  return (
    <DashboardFrame title="My Appointments" subtitle="Manage upcoming consultations, track status, and review your visit history.">
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
          <Link href="/doctors" style={styles.emptyPanelAction}>Find a Doctor</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {filtered.map((item) => (
            <div key={item.id} className="hover-lift" style={styles.appointmentCard}>
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
    <DashboardFrame title="My Account" subtitle="Manage your profile, appointments, records, and support requests from one place.">
      <div style={styles.profileLayout}>
        <section style={styles.profileOverview}>
          <div style={styles.profileMonogram}>P</div>
          <h2 style={styles.profileOverviewTitle}>{profile?.name || user?.name || "Your Profile"}</h2>
          <p style={styles.profileOverviewCopy}>{profile?.email || user?.email}</p>
        </section>

        <section style={styles.sectionBlock}>
          {[
            ["Appointments", "View and manage bookings", "/appointments"],
            ["Instant Doctor Call", "Request an urgent consultation", "/instant-call"],
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
      </div>
      <div style={styles.stockText}>Ready to add to cart</div>
      {line ? (
        <div style={styles.pharmacyCardQuantityBox}>
          <button style={styles.pharmacyCardQuantityButton} onClick={() => decrementProduct(product.id)} aria-label={`Remove one ${product.name}`}>−</button>
          <span style={styles.pharmacyCardQuantityValue}>{line.quantity}</span>
          <button style={styles.pharmacyCardQuantityButton} onClick={handleAdd} aria-label={`Add one more ${product.name}`}>+</button>
        </div>
      ) : (
        <button className="primary-action-btn" style={styles.primaryAction} onClick={handleAdd}>Add to Cart</button>
      )}
    </div>
  );
}

export function WebPharmacyScreen() {
  const [products, setProducts] = useState<DemoPharmacyProduct[]>(DEMO_PHARMACY_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
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

  const categories = useMemo(() => Array.from(new Set(products.map((item) => item.category))), [products]);
  const filteredProducts = useMemo(
    () =>
      products.filter((item) => {
        const haystack = `${item.name} ${item.subtitle} ${item.category}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [products, query],
  );

  return (
    <DashboardFrame
      title="Pharmacy"
      subtitle="Browse medicine categories, compare prices, and check out securely for doorstep delivery."
    >
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Doorstep Delivery</span>
        <h2 style={styles.heroHeadingAlt}>Order medicines from verified pharmacies</h2>
        <p style={styles.heroCopy}>Compare prices across approved pharmacies and check out securely — you&apos;ll add your delivery address at checkout.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search medicines, healthcare items, and categories"
          placeholder="Search medicines, healthcare items, and categories"
        />
      </section>

      {loading ? <ProductGridSkeleton /> : null}

      {!loading && query && !filteredProducts.length ? (
        <div style={styles.noticeCard}>No medicines match &quot;{query}&quot;. Try a different search term.</div>
      ) : null}

      {loading ? null : categories.map((category) => {
        const items = filteredProducts.filter((item) => item.category === category);
        if (!items.length) return null;
        return (
        <section key={category} style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>{category}</h2>
          </div>
          <div style={styles.productGrid}>
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
        );
      })}

      {cart.itemCount ? <div style={{ height: 140 }} aria-hidden="true" /> : null}

      {cart.itemCount ? (
        <Link href="/pharmacy/cart" className="hover-lift" style={styles.pharmacyCheckoutBar}>
          <div style={styles.pharmacyCheckoutIconWrap}>
            <span style={styles.pharmacyCheckoutIcon} aria-hidden="true">🛒</span>
            <span style={styles.pharmacyCheckoutBadge}>{cart.itemCount}</span>
          </div>
          <div style={styles.pharmacyCheckoutCopy}>
            <strong style={styles.pharmacyCheckoutTitle}>Proceed to Checkout</strong>
            <span style={styles.pharmacyCheckoutMeta}>View cart details · {formatMoney(cart.total)}</span>
          </div>
          <span style={styles.pharmacyCheckoutArrow} aria-hidden="true">→</span>
        </Link>
      ) : null}
    </DashboardFrame>
  );
}

export function WebLabTestsScreen() {
  const [tests, setTests] = useState<LabTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedLabTests()
      .then(setTests)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      tests.filter((test) => {
        const haystack = `${test.name} ${test.category} ${test.labName} ${test.city}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [tests, query],
  );

  return (
    <DashboardFrame title="Lab Tests" subtitle="Search diagnostic tests, compare lab prices, and choose home collection or a center visit.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Lab Tests</span>
        <h2 style={styles.heroHeadingAlt}>Trusted diagnostics with clear pricing and faster reports.</h2>
        <p style={styles.heroCopy}>Browse verified lab tests, review report turnaround times, and compare pricing across labs near you.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search tests, categories, or lab names"
          placeholder="Search tests, categories, or lab names..."
        />
      </section>

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? (
        <div style={styles.noticeCard}>{loadError ? "Unable to load lab tests right now. Please refresh the page." : "No approved lab tests available yet."}</div>
      ) : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((test) => (
          <Link key={test.id} href={`/lab-tests/${test.id}`} className="hover-lift" style={styles.infoTileCard}>
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
              <strong>{test.price > 0 ? formatMoney(test.price) : "Fee on request"}</strong>
              <span style={styles.availableLabel}>Book test</span>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

const LAB_TIME_SLOTS = ["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "05:00 PM", "06:00 PM"];

export function WebLabTestDetailScreen({ testId }: { testId: string }) {
  const { requireAuth } = useAuthActionGuard();
  const [test, setTest] = useState<LabTestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [collectionType, setCollectionType] = useState<"home" | "lab">("home");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState(todayIsoDate);
  const [time, setTime] = useState(LAB_TIME_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchApprovedLabTests()
      .then((items) => {
        const found = items.find((item) => item.id === testId) || null;
        setTest(found);
        if (found) setCity(found.city !== "Location not specified" ? found.city : "");
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [testId]);

  async function handleSubmit() {
    setError("");
    const user = requireAuth(`/lab-tests/${testId}`);
    if (!user || !test) return;
    if (collectionType === "home" && !address.trim()) {
      setError("Add an address for home sample collection.");
      return;
    }

    setSubmitting(true);
    try {
      await beginWebPayment({
        kind: "lab_booking",
        returnTo: "/lab-tests/bookings?created=1",
        redirectUri: `${window.location.origin}/payment-callback`,
        booking: {
          labId: test.labId,
          labName: test.labName,
          labAddress: collectionType === "lab" ? test.labAddress : null,
          city: city || test.city,
          catalogTestId: test.catalogTestId,
          testName: test.name,
          homeCollection: collectionType === "home",
          reportTime: test.reportTime,
          notes: JSON.stringify({ collectionType, date, time, address: collectionType === "home" ? address : null, notes }),
        },
        payment: {
          serviceType: "lab_booking",
          serviceLabel: test.name,
          description: `${test.name} at ${test.labName}`,
          amount: test.price,
          paymentMethod: "upi",
          providerName: test.labName,
          bookingRef: { kind: "lab_booking", approvalId: test.id },
          customer: { name: user.name, email: user.email, phone: user.phone },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardFrame title="Lab Test" subtitle="Loading test details...">
        <div style={styles.noticeCard}>Loading test details...</div>
      </DashboardFrame>
    );
  }

  if (!test) {
    return (
      <DashboardFrame title="Lab Test" subtitle="This test is no longer available.">
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>{loadError ? "Unable to load this test" : "Test not found"}</h2>
          <p style={styles.emptyCopy}>
            {loadError ? "Something went wrong loading this lab test. Please refresh the page." : "This lab test may have been removed or is no longer approved."}
          </p>
          <Link href="/lab-tests" style={styles.emptyPanelAction}>Browse Lab Tests</Link>
        </section>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame title={test.name} subtitle={`${test.labName} · ${test.city}`}>
      {error ? <div style={styles.errorNote}>{error}</div> : null}

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Test Details</h2>
        </div>
        <div className="responsive-grid-2col" style={styles.infoStatGrid}>
          <div style={styles.infoStatCard}>
            <strong>Category</strong>
            <span>{test.category}</span>
          </div>
          <div style={styles.infoStatCard}>
            <strong>Report time</strong>
            <span>{test.reportTime}</span>
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Sample Collection</h2>
        </div>
        <div style={styles.chipRow}>
          <button type="button" onClick={() => setCollectionType("home")} style={{ ...styles.filterChip, ...(collectionType === "home" ? styles.filterChipActive : {}) }}>
            Home Collection
          </button>
          <button type="button" onClick={() => setCollectionType("lab")} style={{ ...styles.filterChip, ...(collectionType === "lab" ? styles.filterChipActive : {}) }}>
            Visit Lab Center
          </button>
        </div>

        <div style={styles.formStack}>
          {collectionType === "home" ? (
            <>
              <label style={styles.fieldLabel}>Collection address</label>
              <textarea style={styles.textArea} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="House / street, landmark" />
            </>
          ) : (
            <div style={styles.noticeCard}>Sample will be collected at {test.labName}{test.labAddress ? ` — ${test.labAddress}` : ""}.</div>
          )}
          <label style={styles.fieldLabel}>City</label>
          <input style={styles.fieldInput} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter city" />
          <label style={styles.fieldLabel}>Preferred date</label>
          <input type="date" style={styles.fieldInput} value={date} min={todayIsoDate()} onChange={(event) => setDate(event.target.value)} />
          <label style={styles.fieldLabel}>Preferred time</label>
          <select style={styles.fieldInput} value={time} onChange={(event) => setTime(event.target.value)}>
            {LAB_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
          <label style={styles.fieldLabel}>Notes (optional)</label>
          <textarea style={styles.textArea} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Fasting status, medical history, or any other note for the lab" />
        </div>
      </section>

      <section style={styles.checkoutBar}>
        <div>
          <strong style={styles.checkoutTitle}>{test.name}</strong>
          <span style={styles.checkoutMeta}>{formatDateTimeLabel(date, time)}</span>
        </div>
        <button onClick={handleSubmit} className="primary-action-btn" style={styles.primaryAction} disabled={submitting}>
          {submitting ? "Starting..." : `Pay ${formatMoney(test.price)}`}
        </button>
      </section>
    </DashboardFrame>
  );
}

function LabBookingsInner() {
  const { user, state: authState } = useCustomerUser();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<LabBookingSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = authState.loading || (Boolean(user) && dataLoading);

  useEffect(() => {
    if (!user) return;
    fetchPatientLabBookings(user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setDataLoading(false));
  }, [user, authState.loading]);

  return (
    <DashboardFrame title="Lab Test Bookings" subtitle="Track your diagnostic test bookings from confirmation to report.">
      {searchParams.get("created") === "1" ? <div style={styles.noticeCard}>Your lab test booking is confirmed. Track its status below.</div> : null}

      {loading ? <div style={styles.noticeCard}>Loading your bookings...</div> : null}

      {!loading && !bookings.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No lab test bookings yet</h2>
          <p style={styles.emptyCopy}>Book a diagnostic test with a verified lab near you.</p>
          <Link href="/lab-tests" style={styles.emptyPanelAction}>Browse Lab Tests</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {bookings.map((booking) => (
            <div key={booking.id} className="hover-lift" style={styles.appointmentCard}>
              <strong>{booking.labName}</strong>
              <span>{booking.homeCollection ? "Home collection" : "Lab visit"}</span>
              <small>{booking.reportTime}</small>
              <p>{formatDate(booking.createdAt)}</p>
              <div style={styles.doctorFooter}>
                <span>{formatBookingStatus(booking.status)}</span>
                <strong>{formatMoney(booking.total)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardFrame>
  );
}

export function WebLabBookingsScreen() {
  return (
    <Suspense fallback={<div style={styles.authPage}><div style={styles.callbackPanel}>Loading your bookings...</div></div>}>
      <LabBookingsInner />
    </Suspense>
  );
}

export function WebHospitalsScreen() {
  const [services, setServices] = useState<HospitalServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedHospitalServices()
      .then(setServices)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      services.filter((service) => {
        const haystack = `${service.providerName} ${service.providerCity} ${service.providerAddress} ${service.serviceName} ${service.category}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [services, query],
  );

  return (
    <DashboardFrame title="Hospitals & Surgeries" subtitle="Browse verified hospitals and surgery centers, compare specialties, and request a consultation.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Hospital Discovery</span>
        <h2 style={styles.heroHeadingAlt}>Compare hospitals, specialties, and treatment access in one place.</h2>
        <p style={styles.heroCopy}>Compare hospital specialties, bed availability, and locations before requesting a consultation.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search hospitals, surgery services, city, address"
          placeholder="Search hospitals, surgery services, city, address..."
        />
      </section>

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? (
        <div style={styles.noticeCard}>{loadError ? "Unable to load hospitals right now. Please refresh the page." : "No approved hospital services available yet."}</div>
      ) : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((service) => (
          <Link key={service.id} href={`/hospitals/${service.id}`} className="hover-lift" style={styles.infoTileCard}>
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
                <strong>{service.price > 0 ? formatMoney(service.price) : "Fee on request"}</strong>
                {service.basePrice > service.price ? <span style={styles.strikeText}>{formatMoney(service.basePrice)}</span> : null}
              </div>
              <span style={styles.availableLabel}>Request consultation</span>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

const HOSPITAL_TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"];

export function WebHospitalDetailScreen({ serviceId }: { serviceId: string }) {
  const { requireAuth } = useAuthActionGuard();
  const [service, setService] = useState<HospitalServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayIsoDate);
  const [time, setTime] = useState(HOSPITAL_TIME_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchApprovedHospitalServices()
      .then((items) => setService(items.find((item) => item.id === serviceId) || null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [serviceId]);

  async function handleSubmit() {
    setError("");
    const user = requireAuth(`/hospitals/${serviceId}`);
    if (!user || !service) return;

    setSubmitting(true);
    try {
      await beginWebPayment({
        kind: "hospital_booking",
        returnTo: "/hospitals/requests?created=1",
        redirectUri: `${window.location.origin}/payment-callback`,
        booking: {
          providerId: service.providerId,
          approvalId: service.id,
          serviceName: service.serviceName,
          appointmentDate: date,
          appointmentTime: time,
          notes: notes || null,
        },
        payment: {
          serviceType: "hospital_booking",
          serviceLabel: service.serviceName,
          description: `${service.serviceName} at ${service.providerName}`,
          amount: service.price,
          paymentMethod: "upi",
          providerId: service.providerId,
          providerName: service.providerName,
          bookingRef: { kind: "hospital_booking", approvalId: service.id },
          customer: { name: user.name, email: user.email, phone: user.phone },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardFrame title="Hospital Service" subtitle="Loading details...">
        <div style={styles.noticeCard}>Loading details...</div>
      </DashboardFrame>
    );
  }

  if (!service) {
    return (
      <DashboardFrame title="Hospital Service" subtitle="This service is no longer available.">
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>{loadError ? "Unable to load this service" : "Service not found"}</h2>
          <p style={styles.emptyCopy}>
            {loadError ? "Something went wrong loading this hospital service. Please refresh the page." : "This hospital service may have been removed or is no longer approved in your area."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/hospitals" style={styles.emptyPanelAction}>Browse Hospitals</Link>
            <Link href="/support" style={styles.secondaryActionLink}>Contact Support</Link>
          </div>
        </section>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame title={service.serviceName} subtitle={`${service.providerName} · ${service.providerCity}`}>
      {error ? <div style={styles.errorNote}>{error}</div> : null}

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Hospital Details</h2>
        </div>
        <p style={styles.tileCopy}>{service.description || "Verified hospital partner."}</p>
        <div className="responsive-grid-2col" style={styles.infoStatGrid}>
          <div style={styles.infoStatCard}>
            <strong>Specialty</strong>
            <span>{service.category}</span>
          </div>
          <div style={styles.infoStatCard}>
            <strong>Address</strong>
            <span>{service.providerAddress}</span>
          </div>
          <div style={styles.infoStatCard}>
            <strong>Beds</strong>
            <span>{service.totalBeds ? `${service.totalBeds} beds` : "On request"}</span>
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Request Consultation</h2>
        </div>
        <div style={styles.noticeCard}>
          This submits a consultation request — the hospital confirms your exact appointment slot after review.
        </div>
        <div style={styles.formStack}>
          <label style={styles.fieldLabel}>Preferred date</label>
          <input type="date" style={styles.fieldInput} value={date} min={todayIsoDate()} onChange={(event) => setDate(event.target.value)} />
          <label style={styles.fieldLabel}>Preferred time</label>
          <select style={styles.fieldInput} value={time} onChange={(event) => setTime(event.target.value)}>
            {HOSPITAL_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
          <label style={styles.fieldLabel}>Reason for visit / medical history summary</label>
          <textarea style={styles.textArea} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe the condition or treatment you'd like to discuss" />
        </div>
      </section>

      <section style={styles.checkoutBar}>
        <div>
          <strong style={styles.checkoutTitle}>{service.serviceName}</strong>
          <span style={styles.checkoutMeta}>{formatDateTimeLabel(date, time)}</span>
        </div>
        <button onClick={handleSubmit} className="primary-action-btn" style={styles.primaryAction} disabled={submitting}>
          {submitting ? "Starting..." : `Pay ${formatMoney(service.price)}`}
        </button>
      </section>
    </DashboardFrame>
  );
}

function HospitalRequestsInner() {
  const { user, state: authState } = useCustomerUser();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<ProviderServiceBookingSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = authState.loading || (Boolean(user) && dataLoading);

  useEffect(() => {
    if (!user) return;
    fetchPatientProviderServiceBookings("hospital", user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setDataLoading(false));
  }, [user, authState.loading]);

  return (
    <DashboardFrame title="Hospital Requests" subtitle="Track your hospital consultation requests and their status.">
      {searchParams.get("created") === "1" ? <div style={styles.noticeCard}>Your consultation request has been sent to the hospital for confirmation.</div> : null}

      {loading ? <div style={styles.noticeCard}>Loading your requests...</div> : null}

      {!loading && !bookings.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No hospital requests yet</h2>
          <p style={styles.emptyCopy}>Request a consultation with a verified hospital or surgery center.</p>
          <Link href="/hospitals" style={styles.emptyPanelAction}>Browse Hospitals</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {bookings.map((booking) => (
            <div key={booking.id} className="hover-lift" style={styles.appointmentCard}>
              <strong>{booking.serviceName}</strong>
              <p>{formatDateTimeLabel(booking.appointmentDate, booking.appointmentTime)}</p>
              <div style={styles.doctorFooter}>
                <span>{formatBookingStatus(booking.status)}</span>
                <strong>{formatMoney(booking.amount)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardFrame>
  );
}

export function WebHospitalRequestsScreen() {
  return (
    <Suspense fallback={<div style={styles.authPage}><div style={styles.callbackPanel}>Loading your requests...</div></div>}>
      <HospitalRequestsInner />
    </Suspense>
  );
}

export function WebCtmriScreen() {
  const [services, setServices] = useState<CtmriServiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedCtmriServices()
      .then(setServices)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      services.filter((service) => {
        const haystack = `${service.providerName} ${service.providerCity} ${service.serviceName} ${service.category}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [services, query],
  );

  return (
    <DashboardFrame title="CT / MRI" subtitle="Compare scan prices, locations, and available diagnostic centers.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Imaging Services</span>
        <h2 style={styles.heroHeadingAlt}>Book scans and compare approved diagnostic centers.</h2>
        <p style={styles.heroCopy}>Find verified imaging centers near you and compare pricing before you book.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search CT, MRI, center, city"
          placeholder="Search CT, MRI, center, city..."
        />
      </section>

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? (
        <div style={styles.noticeCard}>{loadError ? "Unable to load imaging services right now. Please refresh the page." : "No approved CT / MRI services available yet."}</div>
      ) : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((service) => (
          <Link key={service.id} href={`/ct-mri/${service.id}`} className="hover-lift" style={styles.infoTileCard}>
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
                <strong>{service.price > 0 ? formatMoney(service.price) : "Fee on request"}</strong>
                {service.basePrice > service.price ? <span style={styles.strikeText}>{formatMoney(service.basePrice)}</span> : null}
              </div>
              <span style={styles.availableLabel}>Book scan</span>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

const CTMRI_TIME_SLOTS = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "03:00 PM", "04:00 PM"];

export function WebCtmriDetailScreen({ serviceId }: { serviceId: string }) {
  const { requireAuth } = useAuthActionGuard();
  const [service, setService] = useState<CtmriServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayIsoDate);
  const [time, setTime] = useState(CTMRI_TIME_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchApprovedCtmriServices()
      .then((items) => setService(items.find((item) => item.id === serviceId) || null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [serviceId]);

  async function handleSubmit() {
    setError("");
    const user = requireAuth(`/ct-mri/${serviceId}`);
    if (!user || !service) return;

    setSubmitting(true);
    try {
      await beginWebPayment({
        kind: "ctmri_booking",
        returnTo: "/ct-mri/bookings?created=1",
        redirectUri: `${window.location.origin}/payment-callback`,
        booking: {
          providerId: service.providerId,
          approvalId: service.id,
          serviceName: service.serviceName,
          appointmentDate: date,
          appointmentTime: time,
          notes: notes || null,
        },
        payment: {
          serviceType: "ctmri_booking",
          serviceLabel: service.serviceName,
          description: `${service.serviceName} at ${service.providerName}`,
          amount: service.price,
          paymentMethod: "upi",
          providerId: service.providerId,
          providerName: service.providerName,
          bookingRef: { kind: "ctmri_booking", approvalId: service.id },
          customer: { name: user.name, email: user.email, phone: user.phone },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardFrame title="Imaging Scan" subtitle="Loading scan details...">
        <div style={styles.noticeCard}>Loading scan details...</div>
      </DashboardFrame>
    );
  }

  if (!service) {
    return (
      <DashboardFrame title="Imaging Scan" subtitle="This service is no longer available.">
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>{loadError ? "Unable to load this service" : "Service not found"}</h2>
          <p style={styles.emptyCopy}>
            {loadError ? "Something went wrong loading this imaging service. Please refresh the page." : "This imaging service may have been removed or is no longer approved in your area."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/ct-mri" style={styles.emptyPanelAction}>Browse Imaging Centers</Link>
            <Link href="/support" style={styles.secondaryActionLink}>Contact Support</Link>
          </div>
        </section>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame title={service.serviceName} subtitle={`${service.providerName} · ${service.providerCity}`}>
      {error ? <div style={styles.errorNote}>{error}</div> : null}

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Center Details</h2>
        </div>
        <p style={styles.tileCopy}>{service.description || "Verified diagnostic imaging center."}</p>
        <div className="responsive-grid-2col" style={styles.infoStatGrid}>
          <div style={styles.infoStatCard}>
            <strong>Category</strong>
            <span>{service.category}</span>
          </div>
          <div style={styles.infoStatCard}>
            <strong>Address</strong>
            <span>{service.providerAddress}</span>
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Schedule Your Scan</h2>
        </div>
        <div style={styles.formStack}>
          <label style={styles.fieldLabel}>Preferred date</label>
          <input type="date" style={styles.fieldInput} value={date} min={todayIsoDate()} onChange={(event) => setDate(event.target.value)} />
          <label style={styles.fieldLabel}>Preferred time</label>
          <select style={styles.fieldInput} value={time} onChange={(event) => setTime(event.target.value)}>
            {CTMRI_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
          <label style={styles.fieldLabel}>Notes for the center (optional)</label>
          <textarea style={styles.textArea} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Referring doctor, prior scans, or any other note" />
        </div>
      </section>

      <section style={styles.checkoutBar}>
        <div>
          <strong style={styles.checkoutTitle}>{service.serviceName}</strong>
          <span style={styles.checkoutMeta}>{formatDateTimeLabel(date, time)}</span>
        </div>
        <button onClick={handleSubmit} className="primary-action-btn" style={styles.primaryAction} disabled={submitting}>
          {submitting ? "Starting..." : `Pay ${formatMoney(service.price)}`}
        </button>
      </section>
    </DashboardFrame>
  );
}

function CtmriBookingsInner() {
  const { user, state: authState } = useCustomerUser();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<ProviderServiceBookingSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = authState.loading || (Boolean(user) && dataLoading);

  useEffect(() => {
    if (!user) return;
    fetchPatientProviderServiceBookings("ctmri", user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setDataLoading(false));
  }, [user, authState.loading]);

  return (
    <DashboardFrame title="CT / MRI Bookings" subtitle="Track your imaging appointments from request to completion.">
      {searchParams.get("created") === "1" ? <div style={styles.noticeCard}>Your scan booking is confirmed. Track its status below.</div> : null}

      {loading ? <div style={styles.noticeCard}>Loading your bookings...</div> : null}

      {!loading && !bookings.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No imaging bookings yet</h2>
          <p style={styles.emptyCopy}>Book a CT or MRI scan with a verified diagnostic center.</p>
          <Link href="/ct-mri" style={styles.emptyPanelAction}>Browse Imaging Centers</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {bookings.map((booking) => (
            <div key={booking.id} className="hover-lift" style={styles.appointmentCard}>
              <strong>{booking.serviceName}</strong>
              <p>{formatDateTimeLabel(booking.appointmentDate, booking.appointmentTime)}</p>
              <div style={styles.doctorFooter}>
                <span>{formatBookingStatus(booking.status)}</span>
                <strong>{formatMoney(booking.amount)}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardFrame>
  );
}

export function WebCtmriBookingsScreen() {
  return (
    <Suspense fallback={<div style={styles.authPage}><div style={styles.callbackPanel}>Loading your bookings...</div></div>}>
      <CtmriBookingsInner />
    </Suspense>
  );
}

export function WebRentalEquipmentScreen() {
  const [items, setItems] = useState<RentalEquipmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedRentalEquipment()
      .then(setItems)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const haystack = `${item.name} ${item.category} ${item.providerName} ${item.city} ${item.brand} ${item.model}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [items, query],
  );

  return (
    <DashboardFrame title="Rental Equipment" subtitle="Browse patient-care equipment, compare rental pricing, and choose the right support for home recovery.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Rental Equipment</span>
        <h2 style={styles.heroHeadingAlt}>Wheelchairs, patient beds, supports, and home-care gear in one place.</h2>
        <p style={styles.heroCopy}>Compare daily, weekly, and monthly rental pricing, security deposits, and provider details before you book.</p>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search equipment, category, city"
          placeholder="Search equipment, category, city..."
        />
      </section>

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? (
        <div style={styles.noticeCard}>{loadError ? "Unable to load rental equipment right now. Please refresh the page." : "No approved rental equipment available yet."}</div>
      ) : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((item) => (
          <Link key={item.id} href={`/rental-equipment/${item.id}`} className="hover-lift" style={styles.infoTileCard}>
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
              <span>{item.stock > 0 ? `${item.stock} in stock` : "Check availability"}</span>
            </div>
            <div style={styles.priceStack}>
              <strong>{formatMoney(item.price)} / day</strong>
              <span>{formatMoney(item.weeklyPrice)} weekly · {formatMoney(item.monthlyPrice)} monthly</span>
            </div>
            <div style={styles.tileFooter}>
              <span>Deposit {formatMoney(item.deposit)}</span>
              <span style={styles.availableLabel}>Request rental</span>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

const RENTAL_PLAN_OPTIONS: Array<{ id: "daily" | "weekly" | "monthly"; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];
const RENTAL_DELIVERY_FEE = 40;

export function WebRentalEquipmentDetailScreen({ equipmentId }: { equipmentId: string }) {
  const { requireAuth } = useAuthActionGuard();
  const [item, setItem] = useState<RentalEquipmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<"daily" | "weekly" | "monthly">("daily");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(todayIsoDate);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchApprovedRentalEquipment()
      .then((items) => setItem(items.find((entry) => entry.id === equipmentId) || null))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [equipmentId]);

  const planPrice = !item ? 0 : plan === "weekly" ? item.weeklyPrice : plan === "monthly" ? item.monthlyPrice : item.price;
  const total = planPrice + RENTAL_DELIVERY_FEE + (item?.deposit || 0);

  async function handleSubmit() {
    setError("");
    const user = requireAuth(`/rental-equipment/${equipmentId}`);
    if (!user || !item) return;
    if (!item.providerId) {
      setError("This equipment listing is missing provider details. Please contact support.");
      return;
    }
    if (!deliveryAddress.trim()) {
      setError("Add a delivery address.");
      return;
    }

    setSubmitting(true);
    try {
      await beginWebPayment({
        kind: "rental_order",
        returnTo: "/rental-equipment/orders?created=1",
        redirectUri: `${window.location.origin}/payment-callback`,
        booking: {
          providerId: item.providerId,
          equipmentId: item.id,
          equipmentName: item.name,
          equipmentImageUrl: item.imageUrl,
          providerName: item.providerName,
          plan,
          rentalDays: plan === "weekly" ? 7 : plan === "monthly" ? 30 : 1,
          deliveryAddress,
          deliveryDate,
          deliveryTimeSlot: null,
        },
        payment: {
          serviceType: "rental_order",
          serviceLabel: item.name,
          description: `${plan} rental of ${item.name}`,
          amount: total,
          paymentMethod: "upi",
          providerId: item.providerId,
          providerName: item.providerName,
          bookingRef: { kind: "rental_order", approvalId: item.id, plan },
          customer: { name: user.name, email: user.email, phone: user.phone },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start payment.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardFrame title="Rental Equipment" subtitle="Loading equipment details...">
        <div style={styles.noticeCard}>Loading equipment details...</div>
      </DashboardFrame>
    );
  }

  if (!item) {
    return (
      <DashboardFrame title="Rental Equipment" subtitle="This item is no longer available.">
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>{loadError ? "Unable to load this item" : "Equipment not found"}</h2>
          <p style={styles.emptyCopy}>
            {loadError ? "Something went wrong loading this equipment listing. Please refresh the page." : "This listing may have been removed or is no longer approved."}
          </p>
          <Link href="/rental-equipment" style={styles.emptyPanelAction}>Browse Rental Equipment</Link>
        </section>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame title={item.name} subtitle={`${item.providerName} · ${item.city}`}>
      {error ? <div style={styles.errorNote}>{error}</div> : null}

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Equipment Details</h2>
        </div>
        <p style={styles.tileCopy}>{item.description || "Verified patient-care equipment."}</p>
        <div className="responsive-grid-2col" style={styles.infoStatGrid}>
          <div style={styles.infoStatCard}>
            <strong>Brand / Model</strong>
            <span>{item.brand || "—"} {item.model}</span>
          </div>
          <div style={styles.infoStatCard}>
            <strong>Availability</strong>
            <span>{item.stock > 0 ? `${item.stock} in stock` : "Check with provider"}</span>
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Choose Rental Plan</h2>
        </div>
        <div style={styles.chipRow}>
          {RENTAL_PLAN_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => setPlan(option.id)} style={{ ...styles.filterChip, ...(plan === option.id ? styles.filterChipActive : {}) }}>
              {option.label} · {formatMoney(option.id === "weekly" ? item.weeklyPrice : option.id === "monthly" ? item.monthlyPrice : item.price)}
            </button>
          ))}
        </div>

        <div style={styles.formStack}>
          <label style={styles.fieldLabel}>Delivery address</label>
          <textarea style={styles.textArea} value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="House / street, city, PIN code" />
          <label style={styles.fieldLabel}>Preferred delivery date</label>
          <input type="date" style={styles.fieldInput} value={deliveryDate} min={todayIsoDate()} onChange={(event) => setDeliveryDate(event.target.value)} />
        </div>

        <div style={styles.summaryPanel}>
          <div style={styles.summaryLine}><span>{RENTAL_PLAN_OPTIONS.find((o) => o.id === plan)?.label} rental</span><strong>{formatMoney(planPrice)}</strong></div>
          <div style={styles.summaryLine}><span>Delivery fee</span><strong>{formatMoney(RENTAL_DELIVERY_FEE)}</strong></div>
          <div style={styles.summaryLine}><span>Security deposit (refundable)</span><strong>{formatMoney(item.deposit)}</strong></div>
          <div style={styles.summaryTotal}><span>Total</span><strong>{formatMoney(total)}</strong></div>
        </div>
      </section>

      <section style={styles.checkoutBar}>
        <div>
          <strong style={styles.checkoutTitle}>{item.name}</strong>
          <span style={styles.checkoutMeta}>{RENTAL_PLAN_OPTIONS.find((o) => o.id === plan)?.label} rental</span>
        </div>
        <button onClick={handleSubmit} className="primary-action-btn" style={styles.primaryAction} disabled={submitting}>
          {submitting ? "Starting..." : `Pay ${formatMoney(total)}`}
        </button>
      </section>
    </DashboardFrame>
  );
}

function RentalOrdersInner() {
  const { user, state: authState } = useCustomerUser();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<RentalOrderSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = authState.loading || (Boolean(user) && dataLoading);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  function load() {
    if (!user) return;
    fetchPatientRentalOrders(user.id)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setDataLoading(false));
  }

  useEffect(load, [user, authState.loading]);

  async function handleReturn(orderId: string) {
    if (!user) return;
    setBusyId(orderId);
    setActionError("");
    try {
      await requestRentalReturn(orderId, user.id, "pickup");
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to request a return.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(orderId: string) {
    if (!user) return;
    setBusyId(orderId);
    setActionError("");
    try {
      await cancelRentalOrder(orderId, user.id);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to cancel this order.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <DashboardFrame title="Rental Orders" subtitle="Track your equipment rentals from delivery to return.">
      {searchParams.get("created") === "1" ? <div style={styles.noticeCard}>Your rental order is confirmed. Track delivery status below.</div> : null}
      {actionError ? <div style={styles.errorNote}>{actionError}</div> : null}

      {loading ? <div style={styles.noticeCard}>Loading your orders...</div> : null}

      {!loading && !orders.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No rental orders yet</h2>
          <p style={styles.emptyCopy}>Rent wheelchairs, beds, and other patient-care equipment for home recovery.</p>
          <Link href="/rental-equipment" style={styles.emptyPanelAction}>Browse Rental Equipment</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {orders.map((order) => {
            const canCancel = ["placed", "accepted"].includes(order.status);
            const canReturn = ["delivered", "active"].includes(order.status);
            return (
              <div key={order.id} className="hover-lift" style={styles.appointmentCard}>
                <strong>{order.equipmentName}</strong>
                <span>{order.providerName}</span>
                <small>{formatBookingStatus(order.plan)} plan · {order.rentalDays} day{order.rentalDays > 1 ? "s" : ""}</small>
                <p>{formatDate(order.createdAt)}</p>
                <div style={styles.doctorFooter}>
                  <span>{formatBookingStatus(order.status)}</span>
                  <strong>{formatMoney(order.total)}</strong>
                </div>
                {canCancel || canReturn ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {canCancel ? (
                      <button onClick={() => handleCancel(order.id)} disabled={busyId === order.id} style={styles.secondaryActionLink}>
                        Cancel
                      </button>
                    ) : null}
                    {canReturn ? (
                      <button onClick={() => handleReturn(order.id)} disabled={busyId === order.id} style={styles.secondaryActionLink}>
                        Request Return
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </DashboardFrame>
  );
}

export function WebRentalOrdersScreen() {
  return (
    <Suspense fallback={<div style={styles.authPage}><div style={styles.callbackPanel}>Loading your orders...</div></div>}>
      <RentalOrdersInner />
    </Suspense>
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
    <DashboardFrame title="Health Card" subtitle="Review health card plans, eligibility, and required documents before you apply.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Health Card</span>
        <h2 style={styles.heroHeadingAlt}>Membership plans, records, and care benefits in one customer view.</h2>
        <p style={styles.heroCopy}>A Saiman Health Card gives your family faster access to partner hospitals and simplified billing.</p>
      </section>

      <div className="responsive-grid-standard" style={styles.twoColumnGrid}>
        <section style={styles.sectionBlock}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Available Plans</h2>
          </div>
          <div className="responsive-grid-3col" style={styles.planCardGrid}>
            {subscriptionPlans.map((plan) => (
              <div key={plan.name} style={styles.membershipCard}>
                <span style={styles.subscriptionTag}>Health Card Plan</span>
                <h3 style={styles.tileTitle}>{plan.name}</h3>
                <div style={styles.membershipPrice}>{plan.price}</div>
                <p style={styles.tileCopy}>{plan.detail}</p>
                <button type="button" onClick={handlePlanView} className="primary-action-btn" style={styles.primaryAction}>View Plan</button>
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
              ["Benefits", "Save on consultations, diagnostics, and pharmacy orders with your membership plan."],
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
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchApprovedStaffingProviders()
      .then(setStaff)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      staff.filter((item) => {
        const haystack = `${item.name} ${item.profession} ${item.city} ${item.qualifications}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [staff, query],
  );

  return (
    <DashboardFrame title="Home Care & Staffing" subtitle="Trained nurses, caregivers, and support professionals for recovery, elder care, and post-surgery support at home.">
      <section style={styles.heroWideCard}>
        <span style={styles.bluePill}>Home Care</span>
        <h2 style={styles.heroHeadingAlt}>Get verified care staff at home, on your schedule.</h2>
        <p style={styles.heroCopy}>Tell us the type of support your patient needs and our dispatch team will confirm pricing and assign a qualified professional.</p>
        <div style={styles.heroActionRow}>
          <Link href="/care-staff/request" style={styles.primaryActionLink}>Request Care Staff</Link>
          <Link href="/care-staff/bookings" style={styles.secondaryActionLink}>My Requests</Link>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <input
          style={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search nurse, caregiver, attendant, city"
          placeholder="Search nurse, caregiver, attendant, city..."
        />
      </section>

      {loading ? <TileGridSkeleton /> : null}
      {!loading && !filtered.length ? (
        <div style={styles.noticeCard}>
          {loadError
            ? "Unable to load care staff providers right now. Please refresh the page."
            : "No approved care staff providers available yet in your area. You can still submit a request and our team will help."}
        </div>
      ) : null}

      <div style={styles.serviceTileGrid}>
        {loading ? null : filtered.map((item) => (
          <Link key={item.id} href="/care-staff/request" className="hover-lift" style={styles.infoTileCard}>
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
              <span>{item.experience != null && item.experience > 0 ? `${item.experience}+ yrs experience` : "Experience on file"}</span>
            </div>
            <div style={styles.tileFooter}>
              <strong>{item.fee != null ? `${formatMoney(item.fee)} / shift` : "Pricing confirmed on request"}</strong>
              <span style={styles.availableLabel}>Request this professional</span>
            </div>
          </Link>
        ))}
      </div>
    </DashboardFrame>
  );
}

const STAFF_TYPE_ICON: Record<string, string> = {
  Nurse: "🩺",
  Physiotherapist: "🏃",
  Caregiver: "🤝",
  Doctor: "🩹",
  "Home Assistant": "🏠",
  "Lab Technician": "🧪",
};

export function WebStaffingRequestScreen() {
  const router = useRouter();
  const { requireAuth } = useAuthActionGuard();
  const [selectedStaff, setSelectedStaff] = useState<Record<string, number>>({});
  const [patientCondition, setPatientCondition] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [city, setCity] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayIsoDate);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState<number>(STAFFING_DURATIONS[1]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selections = STAFF_TYPES.map((type) => ({ type, count: selectedStaff[type] || 0 })).filter((item) => item.count > 0);
  const numberOfStaff = selections.reduce((sum, item) => sum + item.count, 0);
  const staffSummary = selections.length ? selections.map((item) => `${item.count} ${item.type}${item.count > 1 ? "s" : ""}`).join(", ") : "";

  function updateCount(type: string, delta: number) {
    setSelectedStaff((current) => {
      const next = Math.max(0, (current[type] || 0) + delta);
      const updated = { ...current };
      if (next <= 0) delete updated[type];
      else updated[type] = next;
      return updated;
    });
  }

  async function handleSubmit() {
    setError("");
    const user = requireAuth("/care-staff/request");
    if (!user) return;
    if (!selections.length) {
      setError("Choose at least one type of care staff.");
      return;
    }
    if (!fullAddress.trim() || !city.trim()) {
      setError("Add the service address and city.");
      return;
    }

    setSubmitting(true);
    try {
      await createStaffingBooking({
        patientId: user.id,
        staffType: staffSummary,
        numberOfStaff,
        bookingItems: selections.map((item) => ({ staffType: item.type, quantity: item.count })),
        patientCondition,
        fullAddress,
        city,
        scheduledDate,
        scheduledTime,
        durationHours,
        specialInstructions,
      });
      router.push("/care-staff/bookings?requested=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit this request.");
      setSubmitting(false);
    }
  }

  return (
    <DashboardFrame title="Request Care Staff" subtitle="Share your patient's care needs, schedule, and address. Our dispatch team confirms pricing and assigns a verified professional.">
      {error ? <div style={styles.errorNote}>{error}</div> : null}

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>What type of care staff do you need?</h2>
        </div>
        <div style={styles.serviceTileGrid}>
          {STAFF_TYPES.map((type) => {
            const count = selectedStaff[type] || 0;
            const active = count > 0;
            return (
              <div
                key={type}
                role="button"
                tabIndex={0}
                onClick={() => updateCount(type, active ? -count : 1)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    updateCount(type, active ? -count : 1);
                  }
                }}
                style={{ ...styles.filterChip, ...(active ? styles.filterChipActive : {}), display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "18px 12px", cursor: "pointer" }}
              >
                <span style={{ fontSize: 28 }}>{STAFF_TYPE_ICON[type] || "🩺"}</span>
                <span>{type}</span>
                {active ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      aria-label={`Remove one ${type}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateCount(type, -1);
                      }}
                      style={styles.quantityButton}
                    >
                      −
                    </button>
                    <strong>{count}</strong>
                    <button
                      type="button"
                      aria-label={`Add one more ${type}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateCount(type, 1);
                      }}
                      style={styles.quantityButton}
                    >
                      +
                    </button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {numberOfStaff ? <p style={styles.tileCopy}>Selected: {staffSummary} ({numberOfStaff} total)</p> : null}
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Schedule &amp; Address</h2>
        </div>
        <div style={styles.formStack}>
          <label style={styles.fieldLabel}>Service address</label>
          <textarea style={styles.textArea} value={fullAddress} onChange={(event) => setFullAddress(event.target.value)} placeholder="House / street, landmark" required />
          <label style={styles.fieldLabel}>City</label>
          <input style={styles.fieldInput} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Enter city" required />
          <label style={styles.fieldLabel}>Date</label>
          <input type="date" style={styles.fieldInput} value={scheduledDate} min={todayIsoDate()} onChange={(event) => setScheduledDate(event.target.value)} />
          <label style={styles.fieldLabel}>Time</label>
          <input type="time" style={styles.fieldInput} value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} />
          <label style={styles.fieldLabel}>Shift duration</label>
          <div style={styles.chipRow}>
            {STAFFING_DURATIONS.map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setDurationHours(hours)}
                style={{ ...styles.filterChip, ...(durationHours === hours ? styles.filterChipActive : {}) }}
              >
                {hours} Hours
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Patient Details</h2>
        </div>
        <div style={styles.formStack}>
          <label style={styles.fieldLabel}>Patient condition / care requirement</label>
          <textarea
            style={styles.textArea}
            value={patientCondition}
            onChange={(event) => setPatientCondition(event.target.value)}
            placeholder="Mobility support, post-surgery recovery, elder care, or any medical assistance needed"
          />
          <label style={styles.fieldLabel}>Special instructions (optional)</label>
          <textarea
            style={styles.textArea}
            value={specialInstructions}
            onChange={(event) => setSpecialInstructions(event.target.value)}
            placeholder="Timing preference, floor access, language preference, or any other note"
          />
        </div>
      </section>

      <section style={styles.checkoutBar}>
        <div>
          <strong style={styles.checkoutTitle}>{staffSummary || "Select care staff to continue"}</strong>
          <span style={styles.checkoutMeta}>Pricing is confirmed by our dispatch team after review</span>
        </div>
        <button onClick={handleSubmit} className="primary-action-btn" style={styles.primaryAction} disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </section>
    </DashboardFrame>
  );
}

function staffingStatusTone(status: string): "upcoming" | "completed" | "cancelled" {
  const normalized = status.toLowerCase();
  if (["completed"].includes(normalized)) return "completed";
  if (["rejected", "cancelled"].includes(normalized)) return "cancelled";
  return "upcoming";
}

function StaffingBookingsInner() {
  const searchParams = useSearchParams();
  const justRequested = searchParams.get("requested") === "1";
  const { user, state: authState } = useCustomerUser();
  const [bookings, setBookings] = useState<StaffingBookingSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = authState.loading || (Boolean(user) && dataLoading);

  useEffect(() => {
    if (!user) return;
    let active = true;

    function load() {
      fetchPatientStaffingBookings(user!.id)
        .then((items) => {
          if (active) setBookings(items);
        })
        .catch(() => {
          if (active) setBookings([]);
        })
        .finally(() => {
          if (active) setDataLoading(false);
        });
    }

    load();
    const unsubscribe = subscribeToPatientStaffingBookings(user.id, load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, authState.loading]);

  return (
    <DashboardFrame title="Care Staff Requests" subtitle="Track the status of your home-care and staffing requests, from submission to assignment.">
      {justRequested ? (
        <div style={styles.noticeCard}>
          Your request has been sent to our dispatch team. We will confirm the assigned professional and pricing shortly — you will see live updates here.
        </div>
      ) : null}

      {loading ? <div style={styles.noticeCard}>Loading your requests...</div> : null}

      {!loading && !bookings.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No care staff requests yet</h2>
          <p style={styles.emptyCopy}>Request a nurse, caregiver, or home-care professional whenever your patient needs support.</p>
          <Link href="/care-staff/request" style={styles.emptyPanelAction}>Request Care Staff</Link>
        </section>
      ) : (
        <div style={styles.appointmentGrid}>
          {bookings.map((booking) => (
            <div key={booking.id} className="hover-lift" style={styles.appointmentCard}>
              <strong>{booking.staffType}</strong>
              <span>{booking.numberOfStaff} staff member{booking.numberOfStaff > 1 ? "s" : ""}</span>
              <small>{booking.city} · {formatDateTimeLabel(booking.scheduledDate, booking.scheduledTime)}</small>
              <p>{booking.durationHours} hour shift{booking.staffName ? ` · Assigned: ${booking.staffName}` : " · Awaiting assignment"}</p>
              <div style={styles.doctorFooter}>
                <span style={staffingStatusTone(booking.status) === "completed" ? styles.greenText : staffingStatusTone(booking.status) === "cancelled" ? styles.danger : undefined}>
                  {booking.status}
                </span>
                <strong>{booking.totalAmount ? formatMoney(booking.totalAmount) : "Pricing pending"}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardFrame>
  );
}

export function WebStaffingBookingsScreen() {
  return (
    <Suspense fallback={<div style={styles.authPage}><div style={styles.callbackPanel}>Loading your requests...</div></div>}>
      <StaffingBookingsInner />
    </Suspense>
  );
}

export function WebAmbulanceScreen() {
  return (
    <DashboardFrame title="Ambulance" subtitle="Request emergency transport and get connected with a nearby ambulance quickly.">
      <div className="responsive-grid-standard" style={styles.twoColumnGrid}>
        <section style={styles.heroPanel}>
          <div style={styles.heroTag}>24×7 Emergency</div>
          <h2 style={styles.heroHeading}>Emergency transport with quicker action steps.</h2>
          <p style={styles.heroCopy}>Request emergency transport, share pickup and drop details, and get connected with a nearby ambulance.</p>
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
              ["Vehicle Assigned", "We'll share driver and vehicle details as soon as one is assigned."],
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
  const { user, state: authState } = useCustomerUser();
  const [completedConsultations, setCompletedConsultations] = useState(0);
  const [labBookings, setLabBookings] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const loading = authState.loading || (Boolean(user) && dataLoading);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchPatientAppointments(user.id), fetchPatientLabBookings(user.id)])
      .then(([appointments, labs]) => {
        setCompletedConsultations(appointments.filter((item) => item.status.toLowerCase() === "completed").length);
        setLabBookings(labs.length);
      })
      .catch(() => {
        setCompletedConsultations(0);
        setLabBookings(0);
      })
      .finally(() => setDataLoading(false));
  }, [user, authState.loading]);

  const recordsSummary = [
    { label: "Completed consultations", value: String(completedConsultations) },
    { label: "Lab bookings", value: String(labBookings) },
    { label: "Prescriptions", value: "Coming soon" },
    { label: "Insurance docs", value: "Coming soon" },
  ];

  return (
    <DashboardFrame title="Records" subtitle="Keep prescriptions, reports, consultation summaries, and health paperwork together in a single web record locker.">
      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Digital Health Locker</h2>
        </div>
        {!user ? (
          <div style={styles.noticeCard}>Log in to see your real consultation and lab booking counts here.</div>
        ) : null}
        <div className="responsive-grid-metrics" style={styles.metricsGrid}>
          {recordsSummary.map((item) => (
            <div key={item.label} style={styles.metricCard}>
              <span style={styles.metricLabel}>{item.label}</span>
              <strong style={styles.metricValue}>{loading && user ? "…" : item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <div style={styles.serviceTileGrid}>
        {[
          ["Prescriptions", "Coming soon — doctor prescriptions and medication instructions in one place.", null],
          ["Lab Reports", "Coming soon — downloadable diagnostic report access.", null],
          ["Consultation Notes", "Review your appointment history from the Appointments page today.", "/appointments"],
          ["Insurance Docs", "Coming soon — keep health cards and supporting paperwork easy to access.", null],
        ].map(([title, copy, href]) =>
          href ? (
            <Link key={title} href={href} className="hover-lift" style={styles.infoTileCard}>
              <h3 style={styles.tileTitle}>{title}</h3>
              <p style={styles.tileCopy}>{copy}</p>
            </Link>
          ) : (
            <div key={title} style={{ ...styles.infoTileCard, opacity: 0.75 }}>
              <h3 style={styles.tileTitle}>{title}</h3>
              <p style={styles.tileCopy}>{copy}</p>
            </div>
          ),
        )}
      </div>
    </DashboardFrame>
  );
}

export function WebSubscriptionPlansScreen() {
  const { requireAuth } = useAuthActionGuard();

  return (
    <DashboardFrame title="Subscription Plans" subtitle="Compare membership plans and choose the coverage that fits your family's needs.">
      <section style={styles.sectionBlock}>
        <div style={styles.sectionHead}>
          <h2 style={styles.sectionTitle}>Membership Plans</h2>
        </div>
        <div className="responsive-grid-3col" style={styles.planCardGrid}>
          {subscriptionPlans.map((plan) => (
            <div key={plan.name} style={styles.membershipCard}>
              <span style={styles.subscriptionTag}>Plan</span>
              <h3 style={styles.tileTitle}>{plan.name}</h3>
              <div style={styles.membershipPrice}>{plan.price}</div>
              <p style={styles.tileCopy}>{plan.detail}</p>
              <button
                type="button"
                className="primary-action-btn" style={styles.primaryAction}
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

export function WebPharmacyCartScreen() {
  const cart = useCart();
  const { requireAuth } = useAuthActionGuard();
  const [submitting, setSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  async function handleCheckout() {
    if (!cart.lines.length) return;
    const user = requireAuth("/pharmacy/cart");
    if (!user) return;
    setCheckoutError("");
    if (!deliveryAddress.trim()) {
      setCheckoutError("Please add a delivery address before checkout.");
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
          pharmacyId: cart.lines[0]?.product.pharmacyId || null,
          subtotal: cart.total,
          deliveryFee: 0,
          total: cart.total,
          itemCount: cart.itemCount,
          pharmacyName: "Saiman Pharmacy",
          deliveryAddress: deliveryAddress.trim(),
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
          bookingRef: {
            kind: "pharmacy_order",
            items: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          },
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
      setCheckoutError(error instanceof Error ? error.message : "Unable to start pharmacy payment.");
      setSubmitting(false);
    }
  }

  if (!cart.itemCount) {
    return (
      <DashboardFrame title="Cart" subtitle="Your cart is empty.">
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>Your cart is empty</h2>
          <p style={styles.emptyCopy}>Browse verified pharmacies and add medicines to get started.</p>
          <Link href="/pharmacy" style={styles.emptyPanelAction}>Browse Medicines</Link>
        </section>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame title="Cart" subtitle={`${cart.itemCount} items ready for secure checkout.`}>
      <div className="responsive-grid-sidebar" style={styles.cartLayout}>
        <section style={styles.sectionBlock}>
          {cart.saved > 0 ? <div style={styles.noticeCard}>You saved {formatMoney(cart.saved)} on this order.</div> : null}
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
                  <button style={styles.quantityButton} onClick={() => decrementProduct(line.product.id)} aria-label={`Remove one ${line.product.name}`}>−</button>
                  <span>{line.quantity}</span>
                  <button style={styles.quantityButton} onClick={() => addProductToCart(line.product)} aria-label={`Add one more ${line.product.name}`}>+</button>
                </div>
              </div>
              <button style={styles.removeButton} onClick={() => removeProduct(line.product.id)} aria-label={`Remove ${line.product.name} from cart`}>Remove</button>
            </div>
          ))}
        </section>

        <aside style={styles.summaryPanel}>
          <h2 style={styles.sectionTitle}>Delivery Address</h2>
          <textarea
            style={styles.textArea}
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="House / street, city, PIN code"
            required
          />
          <h2 style={styles.sectionTitle}>Price Details</h2>
          <div style={styles.summaryLine}><span>Total MRP</span><strong>{formatMoney(cart.mrp)}</strong></div>
          <div style={styles.summaryLine}><span>Discount on MRP</span><strong style={styles.greenText}>- {formatMoney(cart.saved)}</strong></div>
          <div style={styles.summaryLine}><span>Delivery Fee</span><strong style={styles.greenText}>FREE</strong></div>
          <div style={styles.summaryTotal}><span>To Pay</span><strong>{formatMoney(cart.total)}</strong></div>
          {checkoutError ? <div style={styles.errorNote}>{checkoutError}</div> : null}
          <button onClick={handleCheckout} className="primary-action-btn" style={{ ...styles.primaryAction, width: "100%" }} disabled={submitting || !cart.itemCount}>
            {submitting ? "Starting..." : "Proceed to Checkout"}
          </button>
        </aside>
      </div>
    </DashboardFrame>
  );
}

export function WebPharmacyOrdersScreen() {
  const { user } = useCustomerUser();
  const [orders, setOrders] = useState<PharmacyOrderSummary[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchPatientPharmacyOrders(user.id)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [user]);

  return (
    <DashboardFrame title="My Pharmacy Orders" subtitle="Track your medicine orders from confirmation to delivery.">
      {!orders.length ? (
        <section style={styles.emptyPanel}>
          <h2 style={styles.emptyTitle}>No pharmacy orders yet</h2>
          <p style={styles.emptyCopy}>Orders placed from checkout will appear here instantly.</p>
          <Link href="/pharmacy" style={styles.emptyPanelAction}>Browse Medicines</Link>
        </section>
      ) : (
        <div className="responsive-grid-3col" style={styles.orderGrid}>
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
  const { user, state: authState } = useCustomerUser();
  const [state, setState] = useState("Verifying payment...");
  const [phase, setPhase] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    if (authState.loading) return;
    let active = true;

    const run = async () => {
      try {
        const { pending, transaction } = await verifyWebPayment(searchParams);
        if (!active) return;

        if (!user) {
          throw new Error("Your session expired during checkout. Please sign in again to finish booking.");
        }

        if (pending.kind === "doctor_booking") {
          const appointment = await createDoctorAppointment({
            doctorId: pending.appointment.doctorId,
            patientId: user.id,
            date: pending.appointment.appointmentDate,
            time: pending.appointment.appointmentTime,
            consultationType: pending.appointment.consultationType,
            fee: pending.appointment.fee,
          });
          await linkTransactionToEntity({
            transactionId: transaction.transactionId,
            entityId: appointment.id,
            entityType: "doctor_appointment",
          });
        } else if (pending.kind === "pharmacy_order") {
          const order = await createPharmacyOrder({
            patientId: user.id,
            pharmacyId: pending.order.pharmacyId,
            paymentMethod: pending.order.paymentMethod,
            subtotal: pending.order.subtotal,
            deliveryFee: pending.order.deliveryFee,
            total: pending.order.total,
            deliveryAddress: pending.order.deliveryAddress,
            items: pending.order.items,
          });
          await linkTransactionToEntity({
            transactionId: transaction.transactionId,
            entityId: order.id,
            entityType: "pharmacy_order",
          });
          clearCart();
        } else if (
          pending.kind === "lab_booking" ||
          pending.kind === "hospital_booking" ||
          pending.kind === "ctmri_booking" ||
          pending.kind === "rental_order"
        ) {
          await fulfillServiceBooking(transaction.transactionId, pending.booking);
        }

        clearPendingPayment();
        setPhase("success");
        setState("Your booking is confirmed. Redirecting you now...");
        setTimeout(() => router.replace(pending.returnTo), 900);
      } catch (error) {
        setPhase("error");
        setState(error instanceof Error ? error.message : "Unable to verify payment.");
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [router, searchParams, user, authState.loading]);

  return (
    <div style={styles.authPage}>
      <div style={styles.confirmationPanel}>
        <div
          style={{
            ...styles.confirmationIcon,
            ...(phase === "success" ? styles.confirmationIconSuccess : phase === "error" ? styles.confirmationIconError : {}),
          }}
        >
          {phase === "verifying" ? <span className="skeleton-shimmer" style={styles.confirmationSpinnerDot} /> : phase === "success" ? "✓" : "!"}
        </div>
        <h1 style={styles.confirmationTitle}>
          {phase === "verifying" ? "Confirming your payment" : phase === "success" ? "Booking confirmed" : "We couldn't confirm this payment"}
        </h1>
        <p style={styles.confirmationCopy}>{state}</p>
        {phase === "error" ? (
          <div style={styles.heroActionRowLight}>
            <Link href="/support" style={styles.secondaryAction}>Contact Support</Link>
            <Link href="/" className="primary-action-btn" style={styles.primaryAction}>Go Home</Link>
          </div>
        ) : null}
        {phase !== "error" && !getPendingPayment() ? <Link href="/" style={{ ...styles.linkAction, marginTop: 8 }}>Go Home</Link> : null}
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
  wideCardGradient:
    "radial-gradient(circle at 88% -10%, rgba(255,255,255,0.16), transparent 46%), radial-gradient(circle at 8% 120%, rgba(15,138,95,0.28), transparent 42%), linear-gradient(135deg, var(--brand-deep) 0%, var(--brand) 68%, var(--brand-hover) 100%)",
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
    fontSize: "0.86rem",
    letterSpacing: "-0.005em",
  },
  fieldInput: {
    width: "100%",
    minHeight: 52,
    borderRadius: "var(--radius-md)",
    border: `1.5px solid ${themeStyles.lineStrong}`,
    background: themeStyles.panel,
    padding: "0 18px",
    fontSize: "0.98rem",
    color: themeStyles.ink,
    transition: "var(--motion-fast)",
  },
  errorNote: {
    padding: "14px 16px",
    borderRadius: "var(--radius-md)",
    background: themeStyles.dangerSoft,
    color: themeStyles.danger,
    border: `1px solid ${themeStyles.dangerLine}`,
    fontWeight: 600,
    fontSize: "0.92rem",
  },
  primaryAction: {
    minHeight: 52,
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: `linear-gradient(135deg, ${themeStyles.brand}, var(--brand-hover))`,
    color: "var(--surface-strong)",
    fontWeight: 800,
    fontSize: "0.98rem",
    cursor: "pointer",
    padding: "0 26px",
    boxShadow: "var(--shadow-card)",
    transition: "var(--motion-fast)",
    letterSpacing: "-0.005em",
  },
  secondaryAction: {
    minHeight: 48,
    borderRadius: "var(--radius-pill)",
    border: `1.5px solid ${themeStyles.lineStrong}`,
    background: themeStyles.panel,
    color: themeStyles.brandDeep,
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 22px",
    transition: "var(--motion-fast)",
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
  authSwitch: {
    marginTop: 4,
    color: themeStyles.brandDeep,
    fontWeight: 700,
    textAlign: "center",
  },
  mainArea: {
    minWidth: 0,
  },
  mainScroll: {
    overflowY: "auto",
    padding: "32px 32px 56px",
  },
  mainInner: {
    maxWidth: 1240,
    margin: "0 auto",
    display: "grid",
    gap: 26,
    width: "100%",
  },
  pageHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 18,
    flexWrap: "wrap",
  },
  pageTitle: {
    margin: 0,
    color: themeStyles.brandDeep,
    fontSize: "clamp(1.6rem, 1.35rem + 1vw, 2.15rem)",
    lineHeight: 1.15,
    letterSpacing: "-0.025em",
    fontWeight: 800,
  },
  pageSubtitle: {
    margin: "8px 0 0",
    maxWidth: 640,
    color: themeStyles.inkSoft,
    lineHeight: 1.6,
    fontSize: "0.96rem",
  },
  mainContent: {
    display: "grid",
    gap: 22,
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
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  statCard: {
    display: "grid",
    gap: 8,
    padding: "18px 20px",
    borderRadius: "var(--radius-lg)",
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
    boxShadow: "var(--shadow-card)",
    transition: "var(--motion-fast)",
  },
  statLabel: {
    color: themeStyles.muted,
    fontSize: "0.74rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  statValue: {
    color: themeStyles.brandDeep,
    fontSize: "1.85rem",
    lineHeight: 1,
    letterSpacing: "-0.03em",
    fontWeight: 700,
  },
  mobileHomeSearchCard: {
    display: "grid",
    gap: 12,
    padding: "18px 20px",
    borderRadius: "var(--radius-lg)",
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
    boxShadow: "var(--shadow-card)",
  },
  mobileHomeSearchLabel: {
    color: themeStyles.brandDeep,
    fontSize: "0.92rem",
    fontWeight: 800,
  },
  mobileHomeSearchRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 12,
  },
  mobileHomeSearchInput: {
    minHeight: 54,
    borderRadius: 18,
    padding: "0 18px",
    fontSize: "1rem",
  },
  mobileHomeSearchButton: {
    minHeight: 54,
    padding: "0 18px",
    borderRadius: 18,
    border: "none",
    background: themeStyles.brand,
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.94rem",
    cursor: "pointer",
  },
  mobileHomeBannerSection: {
    display: "grid",
    gap: 12,
  },
  mobileHomeBannerCard: {
    position: "relative",
    display: "grid",
    alignItems: "end",
    minHeight: 300,
    width: "100%",
    overflow: "hidden",
    padding: "28px",
    border: "none",
    borderRadius: 28,
    background: "linear-gradient(135deg, rgba(29, 78, 216, 0.96), rgba(15, 42, 92, 0.98))",
    boxShadow: "var(--shadow-strong)",
    cursor: "pointer",
    textAlign: "left",
    isolation: "isolate",
  },
  mobileHomeBannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.72))",
    zIndex: 1,
  },
  mobileHomeBannerGlow: {
    position: "absolute",
    inset: "auto -80px -100px auto",
    width: 240,
    height: 240,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)",
    zIndex: 1,
  },
  mobileHomeBannerContent: {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gap: 12,
    maxWidth: 520,
    color: "#fff",
  },
  mobileHomeBannerTag: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "7px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.22)",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontSize: "0.72rem",
    fontWeight: 800,
  },
  mobileHomeBannerTitle: {
    margin: 0,
    fontSize: "clamp(2rem, 1.6rem + 1vw, 3.25rem)",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    fontWeight: 900,
  },
  mobileHomeBannerCopy: {
    margin: 0,
    fontSize: "1rem",
    lineHeight: 1.6,
    color: "rgba(255,255,255,0.92)",
  },
  mobileHomeBannerAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    width: "fit-content",
    marginTop: 6,
    padding: "14px 20px",
    borderRadius: 999,
    background: "#fff",
    color: themeStyles.brand,
    fontWeight: 900,
    fontSize: "0.96rem",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
  },
  mobileHomeBannerDots: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
  },
  mobileHomeBannerDot: {
    width: 10,
    height: 10,
    padding: 0,
    borderRadius: "50%",
    border: "none",
    background: themeStyles.lineStrong,
    cursor: "pointer",
  },
  mobileHomeBannerDotActive: {
    background: themeStyles.brand,
    transform: "scale(1.1)",
  },
  mobileHomeServicesShell: {
    display: "grid",
    gap: 16,
    padding: "20px",
    borderRadius: 28,
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panel,
    boxShadow: "var(--shadow-card)",
  },
  mobileHomeServicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 18,
  },
  mobileHomeServiceCard: {
    display: "grid",
    justifyItems: "center",
    gap: 12,
    padding: "14px 12px 10px",
    borderRadius: 24,
    border: `1px solid ${themeStyles.line}`,
    background: "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
    minHeight: 188,
    textAlign: "center",
  },
  mobileHomeServiceCardRestricted: {
    display: "grid",
    justifyItems: "center",
    gap: 12,
    padding: "14px 12px 10px",
    borderRadius: 24,
    border: `1px solid ${themeStyles.line}`,
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
    minHeight: 188,
    textAlign: "center",
    opacity: 0.72,
    cursor: "not-allowed",
  },
  mobileHomeServiceImageWrap: {
    display: "grid",
    placeItems: "center",
    width: 112,
    height: 112,
    borderRadius: 24,
    background: "linear-gradient(180deg, #ffffff 0%, #eef4ff 100%)",
    border: `1px solid ${themeStyles.line}`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
  },
  mobileHomeServiceImage: {
    width: 92,
    height: 92,
    objectFit: "contain",
  },
  mobileHomeServiceTitle: {
    color: themeStyles.brandDeep,
    fontSize: "1rem",
    lineHeight: 1.35,
    letterSpacing: "-0.02em",
  },
  mobileHomeServiceBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "var(--warning-soft)",
    color: "var(--warning)",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
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
    gap: 12,
    flexWrap: "wrap",
    marginTop: 18,
  },
  primaryActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 20px",
    borderRadius: "var(--radius-pill)",
    background: themeStyles.panel,
    color: themeStyles.brandDeep,
    fontWeight: 800,
    fontSize: "0.9rem",
    boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
    transition: "var(--motion-fast)",
    letterSpacing: "-0.005em",
  },
  secondaryActionLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 20px",
    borderRadius: "var(--radius-pill)",
    background: "rgba(255,255,255,0.12)",
    color: "var(--surface-strong)",
    border: "1.5px solid rgba(255,255,255,0.3)",
    fontWeight: 700,
    fontSize: "0.9rem",
    transition: "var(--motion-fast)",
  },
  emptyPanelAction: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "0 26px",
    borderRadius: "var(--radius-pill)",
    background: `linear-gradient(135deg, ${themeStyles.brand}, var(--brand-hover))`,
    color: "var(--surface-strong)",
    fontWeight: 800,
    fontSize: "0.95rem",
    boxShadow: "var(--shadow-card)",
    transition: "var(--motion-fast)",
    letterSpacing: "-0.005em",
    textDecoration: "none",
  },
  sideFeatureStack: {
    display: "grid",
    gap: 12,
  },
  searchModule: {
    borderRadius: "var(--radius-lg)",
    background: themeStyles.panel,
    padding: 18,
    border: `1px solid ${themeStyles.line}`,
    boxShadow: "var(--shadow-card)",
    display: "grid",
    gap: 10,
    color: themeStyles.brandDeep,
    fontSize: "0.92rem",
  },
  tipCard: {
    borderRadius: "var(--radius-lg)",
    background: themeStyles.panel,
    padding: 18,
    border: `1px solid ${themeStyles.line}`,
    boxShadow: "var(--shadow-card)",
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
    borderRadius: "var(--radius-lg)",
    background: themeStyles.panel,
    padding: 24,
    border: `1px solid ${themeStyles.line}`,
    boxShadow: "var(--shadow-card)",
  },
  sectionHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    color: themeStyles.brandDeep,
    fontSize: "1.22rem",
    lineHeight: 1.25,
    letterSpacing: "-0.015em",
    fontWeight: 800,
  },
  linkActionInline: {
    color: themeStyles.brand,
    fontWeight: 700,
    fontSize: "0.86rem",
  },
  serviceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 14,
  },
  serviceCard: {
    display: "grid",
    gap: 8,
    padding: 18,
    borderRadius: "var(--radius-md)",
    border: `1px solid ${themeStyles.line}`,
    background: themeStyles.panelSoft,
    fontSize: "0.88rem",
    transition: "var(--motion-standard)",
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: "var(--radius-md)",
    display: "grid",
    placeItems: "center",
    background: themeStyles.brandTint,
    color: themeStyles.brand,
    fontWeight: 900,
    fontSize: "1.3rem",
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
    position: "relative",
    overflow: "hidden",
    borderRadius: "var(--radius-lg)",
    padding: "28px 32px",
    background: themeStyles.wideCardGradient,
    color: "var(--surface-strong)",
    boxShadow: "var(--shadow-brand)",
  },
  bluePill: {
    display: "inline-flex",
    padding: "6px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.16)",
    color: "var(--surface-strong)",
    fontWeight: 800,
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    border: "1px solid rgba(255,255,255,0.22)",
  },
  heroHeadingAlt: {
    margin: "14px 0 6px",
    fontSize: "clamp(1.35rem, 1.15rem + 0.8vw, 1.75rem)",
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
    fontWeight: 800,
    maxWidth: 600,
  },
  heroMetricRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 14,
  },
  metricBadge: {
    display: "inline-flex",
    padding: "7px 13px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
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
  categoryScroller: {
    display: "flex",
    gap: 12,
    overflowX: "auto",
    paddingBottom: 6,
    alignItems: "flex-start",
  },
  categoryCard: {
    flex: "0 0 132px",
    width: 132,
    minWidth: 132,
    maxWidth: 132,
    padding: "8px 10px 0",
    border: "none",
    background: "transparent",
    color: "var(--ink-soft)",
    display: "grid",
    justifyItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  categoryCardActive: {
    color: "var(--brand)",
  },
  categoryIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    background: "var(--surface-strong)",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "var(--line)",
    display: "grid",
    placeItems: "center",
    boxShadow: "var(--shadow-card)",
    transition: "var(--motion-fast)",
  },
  categoryIconWrapActive: {
    background: "var(--brand-tint)",
    borderColor: "var(--brand)",
    boxShadow: "var(--shadow-brand)",
  },
  categoryIconGlyph: {
    fontSize: "1.8rem",
    lineHeight: 1,
    fontWeight: 800,
    color: "currentColor",
  },
  categoryLabel: {
    width: "100%",
    fontSize: "0.9rem",
    fontWeight: 700,
    lineHeight: 1.25,
    textAlign: "center",
    minHeight: 48,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },
  categoryLabelActive: {
    color: "var(--brand)",
  },
  filterToolbar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterToolbarChips: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    flex: 1,
  },
  filterButton: {
    minHeight: 44,
    padding: "0 18px",
    borderRadius: "var(--radius-pill)",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "var(--line)",
    background: "var(--surface-strong)",
    color: "var(--ink)",
    fontWeight: 800,
    fontSize: "0.95rem",
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  filterButtonGlyph: {
    fontSize: "1rem",
    lineHeight: 1,
  },
  filterChip: {
    minHeight: 40,
    padding: "0 16px",
    borderRadius: "var(--radius-pill)",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "var(--line)",
    background: "var(--surface-strong)",
    color: "var(--ink-soft)",
    fontWeight: 700,
    fontSize: "0.86rem",
    cursor: "pointer",
    transition: "var(--motion-fast)",
  },
  filterSelectWrap: {
    position: "relative",
    minWidth: 156,
    flex: "0 0 auto",
  },
  filterSelect: {
    width: "100%",
    minHeight: 44,
    padding: "0 46px 0 18px",
    borderRadius: "var(--radius-pill)",
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "var(--line)",
    background: "var(--surface-strong)",
    color: "var(--ink)",
    fontWeight: 700,
    fontSize: "0.94rem",
    cursor: "pointer",
    appearance: "none",
    boxShadow: "var(--shadow-card)",
    outline: "none",
  },
  filterSelectChevron: {
    position: "absolute",
    top: "50%",
    right: 18,
    transform: "translateY(-50%)",
    fontSize: "0.95rem",
    lineHeight: 1,
    color: "var(--ink-soft)",
    pointerEvents: "none",
  },
  filterChipActive: {
    background: "var(--brand)",
    color: "var(--surface-strong)",
    borderColor: "var(--brand)",
    boxShadow: "var(--shadow-card)",
  },
  doctorGrid: {
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
    minWidth: 0,
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
    flexWrap: "wrap",
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
  doctorCardAction: {
    minHeight: 44,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "#c8efd9",
    background: "#ffffff",
    color: "#1b9b6a",
    fontWeight: 800,
    fontSize: "0.92rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeroGrid: {},
  profileCard: {
    borderRadius: 12,
    padding: 18,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
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
    bottom: 20,
    zIndex: 2,
    borderRadius: "var(--radius-lg)",
    padding: "18px 22px",
    background: "rgba(255,255,255,0.98)",
    backdropFilter: "blur(12px)",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-floating)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  checkoutTitle: {
    display: "block",
    color: "var(--brand-deep)",
    fontSize: "1.02rem",
    fontWeight: 800,
  },
  checkoutMeta: {
    display: "block",
    marginTop: 4,
    color: "var(--ink-soft)",
    fontSize: "0.88rem",
  },
  twoColumnGrid: {},
  onlineMarker: {
    color: "var(--brand)",
    fontWeight: 800,
  },
  specialtyGrid: {
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
    minHeight: 130,
    borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--line-strong)",
    background: "var(--surface-strong)",
    padding: 16,
    fontSize: "0.95rem",
    lineHeight: 1.5,
    resize: "vertical",
    fontFamily: "inherit",
    transition: "var(--motion-fast)",
  },
  noticeCard: {
    borderRadius: "var(--radius-md)",
    padding: "16px 18px",
    background: "var(--brand-tint)",
    color: "var(--brand-deep)",
    border: "1px solid var(--line-strong)",
    fontSize: "0.92rem",
    lineHeight: 1.55,
    fontWeight: 500,
  },
  tabRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    padding: 4,
    background: "var(--surface-muted)",
    borderRadius: "var(--radius-pill)",
    width: "fit-content",
  },
  tabButton: {
    minHeight: 44,
    padding: "0 20px",
    borderRadius: "var(--radius-pill)",
    border: "none",
    background: "transparent",
    color: "var(--ink-soft)",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    transition: "var(--motion-fast)",
  },
  tabButtonActive: {
    background: "var(--surface-strong)",
    color: "var(--brand-deep)",
    boxShadow: "var(--shadow-card)",
  },
  emptyPanel: {
    borderRadius: "var(--radius-lg)",
    padding: "48px 32px",
    background: "var(--surface-strong)",
    border: "1px dashed var(--line-strong)",
    textAlign: "center",
    display: "grid",
    gap: 10,
    justifyItems: "center",
  },
  emptyTitle: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.3rem",
    lineHeight: 1.2,
    letterSpacing: "-0.015em",
    fontWeight: 800,
  },
  emptyCopy: {
    margin: 0,
    color: "var(--ink-soft)",
    maxWidth: "42ch",
    lineHeight: 1.6,
  },
  appointmentGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
  appointmentCard: {
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--line)",
    background: "var(--surface-strong)",
    padding: 20,
    boxShadow: "var(--shadow-card)",
    display: "grid",
    gap: 8,
    color: "var(--brand-deep)",
    transition: "var(--motion-fast)",
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
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
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
    minWidth: 44,
    minHeight: 44,
  },
  pharmacyCardQuantityBox: {
    display: "grid",
    gridTemplateColumns: "56px minmax(0, 1fr) 56px",
    alignItems: "center",
    width: "100%",
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: "rgba(47, 89, 255, 0.22)",
    background: "rgba(255,255,255,0.96)",
    color: "var(--brand-deep)",
    fontWeight: 800,
    boxShadow: "0 10px 24px rgba(47, 89, 255, 0.08)",
  },
  pharmacyCardQuantityButton: {
    border: "none",
    background: "transparent",
    color: "var(--brand)",
    fontSize: "2rem",
    lineHeight: 1,
    cursor: "pointer",
    minWidth: 56,
    minHeight: 52,
  },
  pharmacyCardQuantityValue: {
    textAlign: "center",
    color: "var(--brand-deep)",
    fontSize: "1.75rem",
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  pharmacyCheckoutBar: {
    position: "fixed",
    left: "50%",
    bottom: 28,
    transform: "translateX(-50%)",
    width: "min(880px, calc(100vw - 40px))",
    display: "grid",
    gridTemplateColumns: "88px minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 18,
    padding: "16px 22px",
    borderRadius: 30,
    background: "linear-gradient(135deg, #3558ff 0%, #2f59ff 42%, #4b66ef 100%)",
    color: "var(--surface-strong)",
    boxShadow: "0 18px 48px rgba(47, 89, 255, 0.28)",
    zIndex: 50,
  },
  pharmacyCheckoutIconWrap: {
    position: "relative",
    width: 72,
    height: 72,
    borderRadius: 22,
    background: "rgba(255,255,255,0.14)",
    display: "grid",
    placeItems: "center",
  },
  pharmacyCheckoutIcon: {
    fontSize: "2rem",
    lineHeight: 1,
  },
  pharmacyCheckoutBadge: {
    position: "absolute",
    top: -6,
    right: -2,
    minWidth: 30,
    height: 30,
    padding: "0 8px",
    borderRadius: 999,
    background: "#22c55e",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "0.95rem",
    border: "3px solid rgba(255,255,255,0.85)",
  },
  pharmacyCheckoutCopy: {
    display: "grid",
    gap: 4,
    minWidth: 0,
  },
  pharmacyCheckoutTitle: {
    fontSize: "1.85rem",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
    fontWeight: 800,
  },
  pharmacyCheckoutMeta: {
    fontSize: "1.15rem",
    lineHeight: 1.3,
    color: "rgba(255,255,255,0.86)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  pharmacyCheckoutArrow: {
    fontSize: "2.8rem",
    lineHeight: 1,
    fontWeight: 700,
  },
  cartLayout: {},
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
    minHeight: 44,
    padding: "0 4px",
  },
  summaryPanel: {
    borderRadius: "var(--radius-lg)",
    padding: 22,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-card)",
    display: "grid",
    gap: 14,
    position: "sticky",
    top: 100,
  },
  summaryLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    color: "var(--ink-soft)",
    fontSize: "0.92rem",
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
    fontSize: "1.4rem",
  },
  greenText: {
    color: "var(--success)",
  },
  strikeText: {
    textDecoration: "line-through",
    color: "#94a3b8",
  },
  orderGrid: {
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
  confirmationPanel: {
    width: "100%",
    maxWidth: 480,
    borderRadius: "var(--radius-lg)",
    padding: "44px 36px",
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-floating)",
    textAlign: "center",
    display: "grid",
    gap: 12,
    justifyItems: "center",
  },
  confirmationIcon: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "var(--brand-tint)",
    color: "var(--brand)",
    fontSize: "1.6rem",
    fontWeight: 900,
    marginBottom: 8,
  },
  confirmationIconSuccess: {
    background: "var(--success-soft)",
    color: "var(--success)",
  },
  confirmationIconError: {
    background: "var(--danger-soft)",
    color: "var(--danger)",
  },
  confirmationSpinnerDot: {
    width: 28,
    height: 28,
    borderRadius: "50%",
  },
  confirmationTitle: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.4rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  confirmationCopy: {
    margin: 0,
    color: "var(--ink-soft)",
    lineHeight: 1.6,
    fontSize: "0.94rem",
  },
  heroActionRowLight: {
    display: "flex",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  serviceTileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 18,
  },
  infoTileCard: {
    borderRadius: "var(--radius-lg)",
    padding: 18,
    background: "var(--surface-strong)",
    border: "1px solid var(--line)",
    boxShadow: "var(--shadow-card)",
    display: "grid",
    gap: 10,
    color: "var(--brand-deep)",
    transition: "var(--motion-standard)",
  },
  tileVisual: {
    height: 132,
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--line)",
    background: "linear-gradient(160deg, var(--brand-tint), var(--surface))",
  },
  staffVisual: {
    height: 132,
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--line)",
    background: "linear-gradient(160deg, var(--brand-tint), var(--surface))",
  },
  tileTitle: {
    margin: 0,
    color: "var(--brand-deep)",
    fontSize: "1.12rem",
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
    fontWeight: 800,
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
    fontSize: "0.9rem",
  },
  tileMetaGrid: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "var(--ink-soft)",
    fontSize: "0.86rem",
  },
  tileFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
    paddingTop: 12,
    borderTop: "1px solid var(--line)",
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
  metricsGrid: {},
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
    fontSize: "clamp(1.15rem, 1rem + 0.6vw, 1.5rem)",
    fontWeight: 900,
    letterSpacing: "-0.02em",
    whiteSpace: "nowrap",
  },
  topicGrid: {
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
