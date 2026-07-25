"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CustomerGuard, useCustomerUser } from "@/components/customer-live";
import {
  fetchActiveInstantCallRequest,
  fetchApprovedDoctors,
  fetchCustomerProfile,
  fetchPatientAppointments,
  loginCustomer,
  requestInstantCall,
  signupCustomer,
  type AppointmentSummary,
  type CustomerProfileSummary,
  type DoctorSummary,
} from "@/lib/customer-web-live";
import {
  addLocalBooking,
  addLocalOrder,
  addProductToCart,
  clearCart,
  decrementProduct,
  DEMO_PHARMACY_PRODUCTS,
  getCartSnapshot,
  getLocalBookings,
  getLocalOrders,
  mobileStoreKeys,
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

function useCart() {
  return useSyncExternalStore(
    (callback) => subscribeStore(mobileStoreKeys.cart, callback),
    () => getCartSnapshot(),
    () => getCartSnapshot(),
  );
}

function useBookings() {
  return useSyncExternalStore(
    (callback) => subscribeStore(mobileStoreKeys.bookings, callback),
    () => getLocalBookings(),
    () => [],
  );
}

function useOrders() {
  return useSyncExternalStore(
    (callback) => subscribeStore(mobileStoreKeys.orders, callback),
    () => getLocalOrders(),
    () => [],
  );
}

function StatusBarMock() {
  return (
    <div style={ui.statusBar}>
      <span style={ui.timeText}>10:56</span>
      <div style={ui.dynamicIsland} />
      <div style={ui.statusIcons}>
        <span style={ui.dots}>••••</span>
        <span style={ui.signal}>⌁</span>
        <span style={ui.battery}>▭</span>
      </div>
    </div>
  );
}

function IconBox({
  label,
  filled = false,
  tone = "#eef3ff",
  color = "#2f59ff",
}: {
  label: string;
  filled?: boolean;
  tone?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        ...ui.iconBox,
        background: filled ? color : tone,
        color: filled ? "#fff" : color,
      }}
    >
      {label}
    </div>
  );
}

function BottomTabs({
  items,
}: {
  items: Array<{ href: string; label: string; icon: string }>;
}) {
  const pathname = usePathname();
  return (
    <div style={ui.bottomTabs}>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} style={{ ...ui.tabLink, color: active ? "#4164f6" : "#9aa5c4" }}>
            <div style={{ ...ui.tabIcon, background: active ? "#eef3ff" : "transparent" }}>{item.icon}</div>
            <span style={{ fontWeight: active ? 800 : 700 }}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function PhoneViewport({
  children,
  tabs,
}: {
  children: React.ReactNode;
  tabs: Array<{ href: string; label: string; icon: string }>;
}) {
  return (
    <CustomerGuard>
      <div style={ui.pageWrap}>
        <div style={ui.phoneViewport}>
          <StatusBarMock />
          <div style={ui.contentScroll}>{children}</div>
          <BottomTabs items={tabs} />
        </div>
      </div>
    </CustomerGuard>
  );
}

function MobileLoginForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, state } = useCustomerUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
    <form onSubmit={onSubmit} style={ui.authForm}>
      {mode === "signup" ? (
        <>
          <label style={ui.label}>Full name</label>
          <input style={ui.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
          <label style={ui.label}>Phone number</label>
          <input style={ui.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
        </>
      ) : null}
      <label style={ui.label}>Email address</label>
      <input style={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      <label style={ui.label}>Password</label>
      <input style={ui.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
      {mode === "signup" ? (
        <>
          <label style={ui.label}>Confirm password</label>
          <input style={ui.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
        </>
      ) : (
        <div style={ui.linkRow}>
          <span />
          <button type="button" style={ui.textLink}>Forgot password?</button>
        </div>
      )}
      {error ? <div style={ui.errorNote}>{error}</div> : null}
      <button type="submit" style={ui.primaryAuthButton} disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Sign In as Patient →" : "Create Account →"}
      </button>
      <div style={ui.dividerRow}>
        <span style={ui.dividerLine} />
        <span style={ui.dividerText}>or</span>
        <span style={ui.dividerLine} />
      </div>
      <div style={ui.socialGrid}>
        <button type="button" style={ui.socialButton}>Google</button>
        <button type="button" style={ui.socialButton}>Mobile OTP</button>
      </div>
      <button type="button" style={ui.verifyButton}>Continue email verification</button>
      <Link href={mode === "login" ? "/auth/signup" : "/auth/login"} style={ui.authSwitch}>
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
      </Link>
    </form>
  );
}

export function MobileLoginScreen() {
  return (
    <div style={ui.pageWrap}>
      <div style={ui.phoneViewport}>
        <StatusBarMock />
        <div style={ui.contentScroll}>
          <div style={ui.authHero}>
            <div style={ui.authHeroBackdrop} />
            <IconBox label="✚" filled color="#2f59ff" />
            <h1 style={ui.authBrand}>Austy Healthcare</h1>
            <p style={ui.authTagline}>Book care, medicines, tests and ambulance support</p>
          </div>
          <div style={ui.authCard}>
            <div style={ui.topBorder} />
            <h2 style={ui.authTitle}>Welcome back</h2>
            <p style={ui.authSubtitle}>Continue to your health dashboard</p>
            <Suspense fallback={<div style={ui.noteBox}>Loading form...</div>}>
              <MobileLoginForm mode="login" />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileSignupScreen() {
  return (
    <div style={ui.pageWrap}>
      <div style={ui.phoneViewport}>
        <StatusBarMock />
        <div style={ui.contentScroll}>
          <div style={ui.authHero}>
            <div style={ui.authHeroBackdrop} />
            <IconBox label="✚" filled color="#2f59ff" />
            <h1 style={ui.authBrand}>Austy Healthcare</h1>
            <p style={ui.authTagline}>Create one account for consults, tests, pharmacy and emergency help</p>
          </div>
          <div style={ui.authCard}>
            <div style={ui.topBorder} />
            <h2 style={ui.authTitle}>Create your account</h2>
            <p style={ui.authSubtitle}>Set up your patient profile to continue</p>
            <Suspense fallback={<div style={ui.noteBox}>Loading form...</div>}>
              <MobileLoginForm mode="signup" />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

const mainTabs = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/doctors", label: "Doctors", icon: "✚" },
  { href: "/instant-call", label: "Instant Call", icon: "☏" },
  { href: "/appointments", label: "Appointments", icon: "▣" },
  { href: "/profile", label: "Profile", icon: "◔" },
];

const pharmacyTabs = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/pharmacy", label: "Pharmacy", icon: "✚" },
  { href: "/pharmacy/cart", label: "Cart", icon: "🛒" },
  { href: "/pharmacy/orders", label: "My Orders", icon: "▤" },
  { href: "/profile", label: "Profile", icon: "◔" },
];

export function MobileHomeScreen() {
  const { user } = useCustomerUser();
  const cart = useCart();

  const services = [
    { label: "Doctor\nConsult", href: "/doctors", emoji: "👨‍⚕️" },
    { label: "Pharmacy", href: "/pharmacy", emoji: "💊" },
    { label: "Lab\nTests", href: "/lab-tests", emoji: "🧪" },
    { label: "CT / MRI", href: "/support", emoji: "🩻" },
    { label: "Ambulance", href: "/ambulance", emoji: "🚑" },
    { label: "Rental\nEquipment", href: "/support", emoji: "♿" },
    { label: "Hospitals &\nSurgeries", href: "/hospitals", emoji: "🏥" },
    { label: "Health\nCard", href: "/subscription-plans", emoji: "💳" },
    { label: "Care Staff", href: "/support", emoji: "🫂" },
  ];

  return (
    <PhoneViewport tabs={mainTabs}>
      <div style={ui.screenHeaderRow}>
        <button style={ui.headerButton}>☰</button>
        <div style={{ flex: 1 }}>
          <div style={ui.greeting}>Good Morning 👋</div>
          <div style={ui.heroName}>{user?.name || "primedepthlabs"}!</div>
          <div style={ui.locationChip}>📍 D178, Industrial Area, I... ▾</div>
        </div>
        <button style={ui.headerButton}>🔔</button>
        <button style={ui.headerAvatar}>P</button>
      </div>

      <div style={ui.searchBar}>
        <span>⌕</span>
        <span style={{ color: "#a1acc9" }}>Search doctors, tests, medicines...</span>
        <div style={ui.searchMic}>🎤</div>
      </div>

      <div style={ui.heroGrid}>
        <div style={ui.mainPromoCard}>
          <span style={ui.promoTag}>LIMITED TIME</span>
          <h2 style={ui.promoTitle}>20% Off On All Lab Tests</h2>
          <p style={ui.promoText}>Book trusted lab tests from verified providers near you.</p>
          <button style={ui.whiteCta}>Book Now →</button>
        </div>
        <div style={ui.sidePromoCard}>
          <div style={ui.sidePromoThumb}>🧪</div>
          <span style={ui.categoryPill}>Lab Tests</span>
          <h3 style={ui.sidePromoTitle}>How to Prepare for a Lab Test</h3>
          <p style={ui.sidePromoText}>Simple steps to get more accurate lab results before your next test.</p>
        </div>
      </div>

      <div style={ui.sectionHeader}>
        <h2 style={ui.sectionTitle}>Our Services</h2>
        <Link href="/support" style={ui.viewAll}>View All ›</Link>
      </div>
      <div style={ui.servicePanel}>
        {services.map((service) => (
          <Link key={service.label} href={service.href} style={ui.serviceCard}>
            <div style={ui.serviceIcon}>{service.emoji}</div>
            <span style={ui.serviceLabel}>{service.label}</span>
          </Link>
        ))}
      </div>

      <h2 style={ui.sectionTitleStandalone}>Health Blogs</h2>
      {[
        {
          tag: "Doctor Consult",
          title: "When Should You Consult a Doctor Online?",
          text: "Video consults are useful for follow-ups, common symptoms, and quick medical guidance.",
        },
        {
          tag: "Pharmacy",
          title: "Medicine Delivery Safety Tips",
          text: "Check dosage, expiry date, and packaging when your medicines arrive.",
        },
      ].map((blog) => (
        <div key={blog.title} style={ui.blogCard}>
          <div style={ui.blogThumb} />
          <div style={{ flex: 1 }}>
            <span style={ui.categoryPill}>{blog.tag}</span>
            <h3 style={ui.blogTitle}>{blog.title}</h3>
            <p style={ui.blogText}>{blog.text}</p>
          </div>
        </div>
      ))}

      <div style={ui.hospitalCallGrid}>
        <div style={ui.hospitalCard}>
          <div style={ui.cardHeaderMini}>✚ Find Hospitals</div>
          {["Nearby Hospitals", "Top Rated Hospitals", "Speciality Hospitals"].map((item) => (
            <div key={item} style={ui.smallOptionRow}>
              <span>{item}</span>
              <span>›</span>
            </div>
          ))}
        </div>
        <div style={ui.teleCard}>
          <span style={ui.liveBadge}>LIVE</span>
          <h3 style={ui.teleTitle}>Teleconsult</h3>
          <p style={ui.teleText}>Talk to a doctor anytime, anywhere</p>
          <Link href="/instant-call" style={ui.darkCardButton}>Start Call</Link>
        </div>
      </div>

      <div style={ui.shortCards}>
        <Link href="/pharmacy" style={ui.shortInfoCard}><strong>Medicine Order</strong><span>Delivered to your door</span></Link>
        <Link href="/records" style={ui.shortInfoCard}><strong>Prescription</strong><span>Upload & manage reports</span></Link>
      </div>

      <div style={ui.ctaGrid}>
        <Link href="/subscription-plans" style={ui.subscriptionCard}>
          <span style={ui.popularTag}>POPULAR</span>
          <h3>Subscription Plan</h3>
          <p>Save up to 20%</p>
          <strong>From ₹799</strong>
        </Link>
        <Link href="/ambulance" style={ui.emergencyCard}>
          <h3>Emergency Help</h3>
          <p>Available 24×7</p>
          <strong>0124 456 7890</strong>
        </Link>
      </div>

      {cart.itemCount > 0 ? (
        <Link href="/pharmacy/cart" style={ui.floatingCheckout}>
          <span>🛒 Proceed to Checkout</span>
          <small>{cart.itemCount} items • {formatMoney(cart.total)}</small>
        </Link>
      ) : null}
    </PhoneViewport>
  );
}

export function MobileDoctorsScreen() {
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");

  useEffect(() => {
    fetchApprovedDoctors()
      .then((items) => setDoctors(items))
      .finally(() => setLoading(false));
  }, []);

  const specialties = useMemo(() => ["All", ...new Set(doctors.map((doctor) => doctor.specialty))], [doctors]);
  const filtered = doctors.filter((doctor) => {
    const matchesSpecialty = specialty === "All" || doctor.specialty === specialty;
    const haystack = `${doctor.name} ${doctor.specialty} ${doctor.hospital}`.toLowerCase();
    return matchesSpecialty && haystack.includes(query.toLowerCase());
  });

  return (
    <PhoneViewport tabs={mainTabs}>
      <div style={ui.topBackRow}>
        <Link href="/" style={ui.headerButton}>←</Link>
        <div style={{ flex: 1 }}>
          <h1 style={ui.pageTitle}>Doctor Consultation</h1>
          <p style={ui.pageSubtitle}>Find and consult top doctors</p>
        </div>
        <button style={ui.headerButton}>🔔</button>
      </div>

      <div style={ui.doctorHero}>
        <span style={ui.whitePill}>Verified Doctors</span>
        <h2 style={ui.doctorHeroTitle}>Consult trusted specialists with clear pricing.</h2>
        <div style={ui.heroStatRow}>
          <span style={ui.heroMiniStat}>120+ Doctors</span>
          <span style={ui.heroMiniStat}>Same day slots</span>
          <span style={ui.heroMiniStat}>Secure care</span>
        </div>
      </div>

      <div style={ui.searchBar}>
        <span>⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search doctors, specialities, hospital..."
          style={ui.searchInput}
        />
        <div style={ui.searchMic}>🎤</div>
      </div>

      <div style={ui.filterScroller}>
        {specialties.slice(0, 6).map((item) => (
          <button
            key={item}
            style={{ ...ui.specialtyChip, ...(specialty === item ? ui.specialtyChipActive : {}) }}
            onClick={() => setSpecialty(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div style={ui.filterBar}>
        {["Filter", "Experience", "Fees", "Availability"].map((item) => (
          <button key={item} style={ui.softFilter}>{item}</button>
        ))}
      </div>

      {loading ? <div style={ui.noteBox}>Loading doctors...</div> : null}
      {filtered.map((doctor) => (
        <Link key={doctor.id} href={`/doctors/${doctor.id}`} style={ui.doctorCard}>
          <div style={ui.doctorImage} />
          <div style={{ flex: 1 }}>
            <div style={ui.doctorCardTitleRow}>
              <h3 style={ui.doctorName}>{doctor.name}</h3>
              <span style={ui.verifiedDot}>✓</span>
            </div>
            <div style={ui.doctorSpecialty}>{doctor.specialty}</div>
            <div style={ui.doctorMeta}>Verified medical practitioner</div>
            <div style={ui.doctorMeta}>⏱ {doctor.experience}+ Years Experience</div>
            <div style={ui.doctorMeta}>🏥 {doctor.hospital}</div>
            <div style={ui.doctorMeta}>⭐ 4.8 (0 Reviews)</div>
            <div style={ui.doctorCardFooter}>
              <strong>{formatMoney(doctor.fee)}</strong>
              <span style={ui.availablePill}>Available Today</span>
            </div>
            <span style={ui.bookButtonLite}>Book Appointment</span>
          </div>
        </Link>
      ))}
    </PhoneViewport>
  );
}

export function MobileDoctorDetailScreen({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const { user } = useCustomerUser();
  const [doctor, setDoctor] = useState<DoctorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("single");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovedDoctors()
      .then((items) => setDoctor(items.find((item) => item.id === doctorId) || null))
      .finally(() => setLoading(false));
  }, [doctorId]);

  async function handleContinue() {
    if (!doctor || !user) return;
    if (!getCallServerBase()) {
      alert("NEXT_PUBLIC_CALL_SERVER_URL is missing for Razorpay checkout.");
      return;
    }
    setSubmitting(true);
    try {
      const fee = selectedPlan === "monthly" ? doctor.fee * 3 : selectedPlan === "yearly" ? doctor.fee * 10 : doctor.fee;
      const appointmentDate = "2026-07-26";
      const appointmentTime = "05:00 AM";
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
          description: `Clinic consultation with ${doctor.name}`,
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
            appointmentDate,
            appointmentTime,
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
    <PhoneViewport tabs={mainTabs}>
      <div style={ui.topBackRow}>
        <button onClick={() => router.back()} style={ui.headerButton}>←</button>
        <h1 style={{ ...ui.pageTitle, flex: 1, textAlign: "center" }}>Doctor Profile</h1>
        <button style={ui.headerButton}>♡</button>
      </div>
      {loading ? <div style={ui.noteBox}>Loading doctor profile...</div> : null}
      {doctor ? (
        <>
          <div style={ui.profileHeroCard}>
            <div style={ui.doctorProfileTop}>
              <div style={ui.profileImageLarge} />
              <div style={{ flex: 1 }}>
                <div style={ui.doctorCardTitleRow}>
                  <h2 style={ui.profileDoctorName}>{doctor.name}</h2>
                  <span style={ui.verifiedDot}>✓</span>
                </div>
                <div style={ui.doctorSpecialty}>{doctor.specialty}</div>
                <p style={ui.doctorMetaBig}>Verified medical practitioner</p>
                <div style={ui.detailPillsRow}>
                  <span style={ui.detailPill}>⭐ 4.8 (0)</span>
                  <span style={ui.detailPill}>⌚ {doctor.experience}+ yrs</span>
                </div>
              </div>
              <div style={ui.priceCallout}>
                <strong>{formatMoney(doctor.fee)}</strong>
                <span>Starts from</span>
              </div>
            </div>
            <div style={ui.locationInlineRow}>
              <span>📍 Online</span>
              <span>🏥 {doctor.hospital}</span>
            </div>
          </div>

          <div style={ui.whiteSectionCard}>
            <h2 style={ui.sectionTitleStandalone}>About Doctor</h2>
            <p style={ui.bodyTextLarge}>
              {doctor.name} is verified on Austy Healthcare and available for appointments through Austy Healthcare.
            </p>
            <div style={ui.infoGrid}>
              <div style={ui.softInfoBox}><strong>Next Available</strong><span>Today · Evening: 05:00 AM - 06:00 AM</span></div>
              <div style={ui.softInfoBox}><strong>Languages</strong><span>English, Hindi</span></div>
            </div>
          </div>

          <div style={ui.whiteSectionCard}>
            <h2 style={ui.sectionTitleStandalone}>Consultation Plans</h2>
            <p style={ui.pageSubtitle}>Single, monthly, and yearly plans</p>
            {[
              { id: "single", title: "Single Consultation", price: doctor.fee, sub: "One-time" },
              { id: "monthly", title: "Monthly Plan", price: doctor.fee * 3, sub: "4 consultations" },
              { id: "yearly", title: "Yearly Plan", price: doctor.fee * 10, sub: "Best value" },
            ].map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                style={{ ...ui.planOption, ...(selectedPlan === plan.id ? ui.planOptionActive : {}) }}
              >
                <div>
                  <strong>{plan.title}</strong>
                  <span>{plan.sub}</span>
                </div>
                <div style={ui.planPriceWrap}>
                  <strong>{formatMoney(plan.price)}</strong>
                  <span>{selectedPlan === plan.id ? "✓" : ""}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div style={ui.stickyFooter}>
        <div>
          <strong style={ui.stickyTitle}>
            {selectedPlan === "monthly" ? "Monthly Plan" : selectedPlan === "yearly" ? "Yearly Plan" : "Single Consultation"}
          </strong>
          <div style={ui.stickyMeta}>Clinic · 2026-07-26 · 05:00 AM</div>
        </div>
        <button onClick={handleContinue} style={ui.footerCta} disabled={submitting}>
          {submitting
            ? "Starting..."
            : `Continue · ${formatMoney(
                selectedPlan === "monthly"
                  ? (doctor?.fee || 0) * 3
                  : selectedPlan === "yearly"
                    ? (doctor?.fee || 0) * 10
                    : doctor?.fee || 0,
              )}`}
        </button>
      </div>
    </PhoneViewport>
  );
}

export function MobileInstantCallScreen() {
  const { user } = useCustomerUser();
  const [specialty, setSpecialty] = useState("General Physician");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [request, setRequest] = useState<{ status: string; specialty: string; callReason: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchActiveInstantCallRequest(user.id).then((value) => setRequest(value ? { status: value.status, specialty: value.specialty, callReason: value.callReason } : null));
  }, [user]);

  async function submit() {
    setSubmitting(true);
    try {
      await requestInstantCall({
        specialty,
        callReason: reason,
        notes,
        preferredLanguage: "English",
      });
      if (user) {
        const next = await fetchActiveInstantCallRequest(user.id);
        if (next) setRequest({ status: next.status, specialty: next.specialty, callReason: next.callReason });
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
    <PhoneViewport tabs={mainTabs}>
      <h1 style={ui.pageTitle}>Instant Call</h1>
      <p style={ui.pageSubtitle}>Request a quick voice consultation with an online doctor.</p>
      <div style={ui.tabToggle}>
        <div style={ui.tabToggleActive}>New Request</div>
        <div style={ui.tabToggleIdle}>Booked Call</div>
      </div>
      <div style={ui.whiteSectionCard}>
        <div style={ui.sectionInlineHeader}>
          <h2 style={ui.sectionTitleStandalone}>Relevant specialty</h2>
          <span style={ui.onlineCount}>5 online</span>
        </div>
        <div style={ui.specialtyGrid}>
          {["Cardiologist", "Dermatologist", "Endocrinologist", "ENT Specialist", "General Physician", "Gynaecologist", "Neurologist", "Orthopaedic"].map((item) => (
            <button
              key={item}
              onClick={() => setSpecialty(item)}
              style={{ ...ui.specialtyTile, ...(specialty === item ? ui.specialtyTileActive : {}) }}
            >
              <div style={ui.specialtyTileIcon}>⌔</div>
              <span>{item}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={ui.whiteSectionCard}>
        <h2 style={ui.sectionTitleStandalone}>Request details</h2>
        <label style={ui.label}>Call purpose / reason</label>
        <input style={ui.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe the purpose of the call" />
        <label style={ui.label}>Symptoms or notes</label>
        <textarea style={ui.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptoms or notes" />
        {request ? <div style={ui.noteBox}>Current request: {request.specialty} • {request.status}</div> : null}
      </div>
      <div style={ui.stickyFooter}>
        <button onClick={submit} style={{ ...ui.footerCta, width: "100%" }} disabled={submitting}>
          {submitting ? "Requesting..." : "Request instant call"}
        </button>
      </div>
    </PhoneViewport>
  );
}

export function MobileAppointmentsScreen() {
  const router = useRouter();
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
    <PhoneViewport tabs={mainTabs}>
      <div style={ui.topBackRow}>
        <button onClick={() => router.back()} style={ui.headerButton}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={ui.pageTitle}>My Appointments</h1>
          <p style={ui.pageSubtitle}>Manage your consultations</p>
        </div>
        <button style={ui.headerButton}>🔔</button>
      </div>
      <div style={ui.doctorHero}>
        <h2 style={ui.doctorHeroTitle}>Your care schedule at a glance</h2>
        <p style={{ ...ui.promoText, maxWidth: "100%" }}>Track visits, online consults, reports, and prescriptions from one clean timeline.</p>
      </div>
      <div style={ui.appointmentTabs}>
        {(["upcoming", "completed", "cancelled"] as const).map((item) => (
          <button key={item} onClick={() => setTab(item)} style={{ ...ui.appointmentTab, ...(tab === item ? ui.appointmentTabActive : {}) }}>
            {item[0].toUpperCase() + item.slice(1)} <span style={ui.countBubble}>{merged.filter((row) => row.status === item).length}</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={ui.emptyStateTall}>
          <div style={ui.emptyGlyph}>🗓</div>
          <h2 style={ui.emptyHeadline}>No {tab[0].toUpperCase() + tab.slice(1)} Appointments</h2>
          <p style={ui.emptyCopy}>Book a consultation with a top doctor.</p>
          <Link href="/doctors" style={ui.primaryEmptyAction}>Find a Doctor</Link>
        </div>
      ) : (
        filtered.map((item) => (
          <div key={item.id} style={ui.appointmentCard}>
            <strong>{item.doctorName}</strong>
            <span>{item.doctorSpecialty}</span>
            <small>{formatDate(item.appointmentDate)} · {item.appointmentTime}</small>
          </div>
        ))
      )}
      <Link href="/doctors" style={{ ...ui.footerCta, display: "block", textAlign: "center", marginTop: 20 }}>
        Book New Appointment
      </Link>
    </PhoneViewport>
  );
}

export function MobileProfileScreen() {
  const router = useRouter();
  const { user } = useCustomerUser();
  const [profile, setProfile] = useState<CustomerProfileSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchCustomerProfile(user.id).then(setProfile).catch(() => setProfile(null));
  }, [user]);

  return (
    <PhoneViewport tabs={mainTabs}>
      <div style={ui.topBackRow}>
        <button onClick={() => router.back()} style={ui.headerButton}>←</button>
        <h1 style={{ ...ui.pageTitle, flex: 1 }}>My Account</h1>
      </div>
      <div style={ui.profileCenterHero}>
        <div style={ui.profileAvatar}>◔</div>
        <h2 style={ui.profileHeroTitle}>Your Profile</h2>
        <p style={ui.pageSubtitle}>Manage your consultation account</p>
      </div>
      <div style={ui.menuPanel}>
        {[
          ["Appointments", "View and manage bookings", "/appointments"],
          ["Video Consults", "Start or join a call", "/instant-call"],
          ["Prescriptions", "View doctor prescriptions", "/records"],
          ["Help & Support", "FAQs and customer care", "/support"],
        ].map(([title, copy, href]) => (
          <Link key={title} href={href} style={ui.menuRow}>
            <div>
              <strong>{title}</strong>
              <span>{copy}</span>
            </div>
            <span>›</span>
          </Link>
        ))}
      </div>
      {profile ? <div style={ui.noteBox}>Signed in as {profile.name} • {profile.email || user?.email}</div> : null}
    </PhoneViewport>
  );
}

function ProductCard({ product }: { product: DemoPharmacyProduct }) {
  const cart = useCart();
  const line = cart.lines.find((item) => item.product.id === product.id);
  return (
    <div style={ui.productCard}>
      <div style={{ ...ui.productVisual, background: product.tone }}>{product.name.slice(0, 1)}</div>
      <strong style={ui.productName}>{product.name}</strong>
      <span style={ui.productSub}>{product.subtitle} · {product.inStock} in stock</span>
      <div style={ui.priceLine}>
        <strong>{formatMoney(product.price)}</strong>
        <span>{product.pharmacyName}</span>
      </div>
      <div style={ui.stockLine}>Ready to add to cart</div>
      {line ? (
        <div style={ui.qtyControl}>
          <button style={ui.qtyButton} onClick={() => decrementProduct(product.id)}>−</button>
          <span>{line.quantity}</span>
          <button style={ui.qtyButton} onClick={() => addProductToCart(product.id)}>+</button>
        </div>
      ) : (
        <button style={ui.addCartButton} onClick={() => addProductToCart(product.id)}>Add to Cart</button>
      )}
    </div>
  );
}

export function MobilePharmacyScreen() {
  const cart = useCart();
  const categories = Array.from(new Set(DEMO_PHARMACY_PRODUCTS.map((item) => item.category)));

  return (
    <PhoneViewport tabs={pharmacyTabs}>
      <div style={ui.pharmacyTopBanner}>
        <div style={ui.pharmacyTopRow}>
          <button style={ui.pharmacyBack}>←</button>
          <div style={{ flex: 1 }}>
            <div style={ui.deliveryLabel}>Delivering to</div>
            <div style={ui.deliveryChip}>📍 D178, Industrial A... ▾</div>
          </div>
          <button style={ui.pharmacyBack}>🔔</button>
          <button style={ui.pharmacyBack}>🛒</button>
        </div>
        <div style={ui.pharmacySearchPanel}>
          <span>⌕ Search medicines, hea...</span>
          <span style={{ fontWeight: 800 }}>Upload Prescription</span>
        </div>
      </div>

      <div style={ui.blueBannerCard}>
        <span style={ui.whitePill}>Pharmacy Banner</span>
        <h2 style={ui.promoTitle}>Order medicines from verified pharmacies</h2>
        <p style={ui.promoText}>Publish Pharmacy Banner in Super Admin CMS to control this space.</p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h2 style={ui.sectionTitleStandalone}>{category}</h2>
          <div style={ui.productGrid}>
            {DEMO_PHARMACY_PRODUCTS.filter((item) => item.category === category).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ))}

      {cart.itemCount > 0 ? (
        <Link href="/pharmacy/cart" style={ui.floatingCheckout}>
          <span>🛒 Proceed to Checkout</span>
          <small>View cart details • {formatMoney(cart.total)}</small>
        </Link>
      ) : null}
    </PhoneViewport>
  );
}

export function MobilePharmacyCartScreen() {
  const cart = useCart();
  const router = useRouter();
  const { user } = useCustomerUser();
  const [submitting, setSubmitting] = useState(false);

  async function handleCheckout() {
    if (!cart.lines.length || !user) return;
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
    <PhoneViewport tabs={pharmacyTabs}>
      <div style={ui.topBackRow}>
        <button onClick={() => router.back()} style={ui.headerButton}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={ui.pageTitle}>Cart</h1>
          <p style={ui.pageSubtitle}>{cart.itemCount} items ready for checkout</p>
        </div>
      </div>
      <div style={ui.noteBox}>You unlocked free delivery on this order.</div>
      {cart.lines.map((line) => (
        <div key={line.product.id} style={ui.cartRow}>
          <div style={{ ...ui.productVisual, width: 96, height: 96, background: line.product.tone }}>{line.product.name.slice(0, 1)}</div>
          <div style={{ flex: 1 }}>
            <strong style={ui.cartTitle}>{line.product.name}</strong>
            <span style={ui.productSub}>{line.product.subtitle} · {line.product.inStock} in stock</span>
            <div style={ui.priceLine}>
              <strong>{formatMoney(line.product.price)}</strong>
              <span style={{ textDecoration: "line-through" }}>{formatMoney(line.product.mrp)}</span>
              <span style={{ color: "#16a34a", fontWeight: 800 }}>13% OFF</span>
            </div>
            <div style={ui.qtyControl}>
              <button style={ui.qtyButton} onClick={() => decrementProduct(line.product.id)}>−</button>
              <span>{line.quantity}</span>
              <button style={ui.qtyButton} onClick={() => addProductToCart(line.product.id)}>+</button>
            </div>
          </div>
          <button style={ui.removeLink} onClick={() => removeProduct(line.product.id)}>Remove</button>
        </div>
      ))}
      <div style={ui.whiteSectionCard}>
        <h2 style={ui.sectionTitleStandalone}>Price Details</h2>
        <div style={ui.summaryRow}><span>Total MRP</span><strong>{formatMoney(cart.mrp)}</strong></div>
        <div style={ui.summaryRow}><span>Discount on MRP</span><strong style={{ color: "#16a34a" }}>- {formatMoney(cart.saved)}</strong></div>
        <div style={ui.summaryRow}><span>Delivery Fee</span><strong style={{ color: "#16a34a" }}>FREE</strong></div>
        <div style={{ ...ui.summaryRow, marginTop: 18, paddingTop: 18, borderTop: "1px solid #e7edf8" }}>
          <span style={{ fontSize: 22, fontWeight: 900 }}>To Pay</span>
          <strong style={{ fontSize: 28, color: "#2f59ff" }}>{formatMoney(cart.total)}</strong>
        </div>
      </div>
      <div style={ui.stickyFooter}>
        <button onClick={handleCheckout} style={{ ...ui.footerCta, width: "100%" }} disabled={submitting || !cart.itemCount}>
          {submitting ? "Starting..." : "Proceed to Checkout"}
        </button>
      </div>
    </PhoneViewport>
  );
}

export function MobilePharmacyOrdersScreen() {
  const orders = useOrders();
  const router = useRouter();
  return (
    <PhoneViewport tabs={pharmacyTabs}>
      <div style={ui.topBackRow}>
        <button onClick={() => router.back()} style={ui.headerButton}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={ui.pageTitle}>My Pharmacy Orders</h1>
          <p style={ui.pageSubtitle}>{orders.length} total • {orders.filter((item) => item.status !== "delivered").length} active</p>
        </div>
        <button style={ui.headerButton}>↻</button>
      </div>
      {!orders.length ? (
        <div style={ui.emptyStateTall}>
          <div style={ui.emptyGlyph}>▤</div>
          <h2 style={ui.emptyHeadline}>No pharmacy orders yet</h2>
          <p style={ui.emptyCopy}>Orders placed from checkout will appear here instantly.</p>
          <Link href="/pharmacy" style={ui.primaryEmptyAction}>Browse Medicines</Link>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} style={ui.orderCard}>
            <strong>{order.pharmacyName}</strong>
            <span>{order.itemCount} items</span>
            <small>{formatMoney(order.total)} • {order.status}</small>
          </div>
        ))
      )}
    </PhoneViewport>
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
          addLocalBooking({
            ...pending.appointment,
          });
        } else if (pending.kind === "pharmacy_order") {
          addLocalOrder({
            ...pending.order,
          });
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
    <div style={ui.pageWrap}>
      <div style={ui.phoneViewport}>
        <StatusBarMock />
        <div style={ui.contentScroll}>
          <div style={ui.emptyStateTall}>
            <div style={ui.emptyGlyph}>₹</div>
            <h2 style={ui.emptyHeadline}>Payment Callback</h2>
            <p style={ui.emptyCopy}>{state}</p>
            {getPendingPayment() ? null : <Link href="/" style={ui.primaryEmptyAction}>Go Home</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentCallbackScreen() {
  return (
    <Suspense fallback={<div style={ui.pageWrap}><div style={ui.phoneViewport}><StatusBarMock /><div style={ui.contentScroll}><div style={ui.noteBox}>Loading payment callback...</div></div></div></div>}>
      <PaymentCallbackInner />
    </Suspense>
  );
}

const ui: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f5f8ff 0%, #edf2ff 100%)",
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  phoneViewport: {
    width: "100%",
    maxWidth: 430,
    minHeight: "100vh",
    background: "#f7f9ff",
    position: "relative",
    overflow: "hidden",
  },
  contentScroll: {
    padding: "0 18px 110px",
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 22px 26px",
    position: "sticky",
    top: 0,
    background: "rgba(247,249,255,0.94)",
    backdropFilter: "blur(10px)",
    zIndex: 5,
  },
  timeText: { fontSize: 28, fontWeight: 800, color: "#0f172a" },
  dynamicIsland: { width: 190, height: 54, background: "#000", borderRadius: 999 },
  statusIcons: { display: "flex", alignItems: "center", gap: 10, color: "#111827", fontWeight: 800 },
  dots: { color: "#c8cedd", letterSpacing: 1 },
  signal: { fontSize: 18 },
  battery: { fontSize: 18 },
  bottomTabs: {
    position: "fixed",
    left: "50%",
    bottom: 0,
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    background: "#fff",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    padding: "10px 8px 22px",
    borderTop: "1px solid #edf1fb",
    zIndex: 10,
  },
  tabLink: {
    display: "grid",
    justifyItems: "center",
    gap: 6,
    textDecoration: "none",
    fontSize: 13,
  },
  tabIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
  },
  iconBox: {
    width: 112,
    height: 112,
    borderRadius: 34,
    display: "grid",
    placeItems: "center",
    margin: "0 auto",
    fontSize: 44,
    fontWeight: 900,
    boxShadow: "0 20px 40px rgba(47,89,255,0.15)",
  },
  authHero: {
    background: "linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.55))",
    borderRadius: 34,
    padding: "28px 20px 24px",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    minHeight: 290,
  },
  authHeroBackdrop: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(230,238,255,0.75), rgba(255,255,255,0.2))",
  },
  authBrand: { position: "relative", zIndex: 1, margin: "22px 0 12px", fontSize: 52, lineHeight: 1, fontWeight: 900, color: "#233f99" },
  authTagline: { position: "relative", zIndex: 1, margin: 0, fontSize: 28, lineHeight: 1.4, fontWeight: 700, color: "#475569" },
  authCard: { marginTop: 18, background: "#fff", borderRadius: 34, padding: 24, boxShadow: "0 20px 50px rgba(38,70,173,0.09)", position: "relative" },
  topBorder: { position: "absolute", left: 0, right: 0, top: 0, height: 6, borderRadius: "34px 34px 0 0", background: "#2f59ff" },
  authTitle: { margin: "28px 0 10px", fontSize: 56, lineHeight: 1, fontWeight: 900, color: "#233f99" },
  authSubtitle: { margin: 0, fontSize: 24, lineHeight: 1.45, color: "#6b7ca5", fontWeight: 600 },
  authForm: { display: "grid", gap: 12, marginTop: 24 },
  label: { fontSize: 18, fontWeight: 800, color: "#394860", marginTop: 10 },
  input: { border: "2px solid #dcebff", borderRadius: 24, padding: "18px 20px", fontSize: 20, color: "#0f172a", background: "#fbfdff", outline: "none" },
  textarea: { border: "2px solid #dcebff", borderRadius: 24, padding: "18px 20px", fontSize: 18, color: "#0f172a", background: "#fbfdff", minHeight: 120, outline: "none", resize: "vertical" },
  linkRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  textLink: { border: "none", background: "none", color: "#2f59ff", fontSize: 18, fontWeight: 800, padding: 0, justifySelf: "end", cursor: "pointer" },
  primaryAuthButton: { marginTop: 18, border: "none", borderRadius: 24, background: "#2f59ff", color: "#fff", fontSize: 24, fontWeight: 900, padding: "20px 24px", cursor: "pointer", boxShadow: "0 20px 40px rgba(47,89,255,0.24)" },
  dividerRow: { display: "flex", alignItems: "center", gap: 16, marginTop: 18 },
  dividerLine: { flex: 1, height: 1, background: "#e7edf8" },
  dividerText: { color: "#9aa5c4", fontWeight: 800, fontSize: 18 },
  socialGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 },
  socialButton: { borderRadius: 22, border: "2px solid #dcebff", padding: "18px 14px", background: "#fff", color: "#1f2f56", fontSize: 20, fontWeight: 800, cursor: "pointer" },
  verifyButton: { border: "none", background: "none", color: "#2f59ff", fontSize: 20, fontWeight: 900, marginTop: 8, cursor: "pointer" },
  authSwitch: { color: "#2f59ff", textAlign: "center", fontWeight: 800, fontSize: 18, textDecoration: "none", marginTop: 8 },
  errorNote: { background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 18, padding: 14, fontWeight: 700 },
  noteBox: { background: "#eef3ff", border: "1px solid #d7e2ff", borderRadius: 20, padding: 16, color: "#2949d3", fontWeight: 700 },
  screenHeaderRow: { display: "flex", alignItems: "center", gap: 14, marginTop: 4 },
  headerButton: { width: 64, height: 64, borderRadius: 24, background: "#fff", border: "1px solid #eef2ff", color: "#223153", fontSize: 32, display: "grid", placeItems: "center", cursor: "pointer", textDecoration: "none" },
  headerAvatar: { width: 64, height: 64, borderRadius: 24, background: "#dfe7ff", border: "1px solid #eef2ff", color: "#4e63e8", fontSize: 28, fontWeight: 900, display: "grid", placeItems: "center", cursor: "pointer" },
  greeting: { fontSize: 18, color: "#7d8db8", fontWeight: 800 },
  heroName: { fontSize: 48, lineHeight: 1, color: "#1b2d67", fontWeight: 900, marginTop: 4 },
  locationChip: { marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "10px 18px", background: "#edf2ff", color: "#4164f6", fontSize: 16, fontWeight: 800 },
  searchBar: { marginTop: 20, background: "#fff", borderRadius: 26, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 14px 32px rgba(51,78,168,0.08)" },
  searchMic: { marginLeft: "auto", width: 56, height: 56, borderRadius: 20, background: "#4164f6", color: "#fff", display: "grid", placeItems: "center", fontSize: 22 },
  heroGrid: { display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 16, marginTop: 22, alignItems: "stretch" },
  mainPromoCard: { borderRadius: 30, padding: 24, background: "linear-gradient(135deg, #202c67 0%, #465dcc 60%, #94a3ff 100%)", color: "#fff", minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "space-between" },
  promoTag: { display: "inline-flex", alignSelf: "flex-start", borderRadius: 999, padding: "8px 14px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.12)", fontWeight: 900, fontSize: 14, letterSpacing: 1 },
  promoTitle: { margin: "18px 0 10px", fontSize: 34, lineHeight: 1.1, fontWeight: 900 },
  promoText: { margin: 0, fontSize: 18, lineHeight: 1.45, color: "rgba(255,255,255,0.86)", maxWidth: 320 },
  whiteCta: { marginTop: 16, alignSelf: "flex-start", borderRadius: 22, border: "none", background: "#fff", color: "#4164f6", fontWeight: 900, fontSize: 20, padding: "14px 20px", cursor: "pointer" },
  sidePromoCard: { borderRadius: 30, background: "#fff", padding: 18, display: "grid", alignContent: "start", gap: 10 },
  sidePromoThumb: { height: 110, borderRadius: 22, background: "linear-gradient(135deg, #eef3ff, #fff7e8)", display: "grid", placeItems: "center", fontSize: 40 },
  categoryPill: { display: "inline-flex", alignSelf: "flex-start", borderRadius: 999, padding: "8px 14px", background: "#eef3ff", color: "#4164f6", fontWeight: 900, fontSize: 14 },
  sidePromoTitle: { margin: 0, fontSize: 26, lineHeight: 1.15, color: "#1a2553", fontWeight: 900 },
  sidePromoText: { margin: 0, fontSize: 18, lineHeight: 1.5, color: "#8d9bbf" },
  sectionHeader: { marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { margin: 0, fontSize: 28, color: "#192655", fontWeight: 900 },
  sectionTitleStandalone: { margin: "28px 0 16px", fontSize: 28, color: "#192655", fontWeight: 900 },
  viewAll: { color: "#4164f6", fontWeight: 900, fontSize: 16, textDecoration: "none" },
  servicePanel: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, background: "#fff", borderRadius: 30, padding: 18, boxShadow: "0 18px 44px rgba(55,79,166,0.06)" },
  serviceCard: { textDecoration: "none", color: "#1c2a58", display: "grid", gap: 10, justifyItems: "center" },
  serviceIcon: { width: 72, height: 72, borderRadius: 22, background: "#f5f8ff", display: "grid", placeItems: "center", fontSize: 32, border: "1px solid #e6ecfb" },
  serviceLabel: { whiteSpace: "pre-line", textAlign: "center", fontWeight: 800, lineHeight: 1.3 },
  blogCard: { background: "#fff", borderRadius: 30, padding: 18, display: "flex", gap: 16, alignItems: "center", marginBottom: 16 },
  blogThumb: { width: 120, height: 120, borderRadius: 24, background: "linear-gradient(135deg, #d8e3ff, #eef4ff)" },
  blogTitle: { margin: "10px 0 8px", fontSize: 22, lineHeight: 1.2, color: "#192655", fontWeight: 900 },
  blogText: { margin: 0, fontSize: 18, lineHeight: 1.45, color: "#8d9bbf" },
  hospitalCallGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 10 },
  hospitalCard: { background: "#fff", borderRadius: 30, padding: 18 },
  cardHeaderMini: { fontSize: 18, fontWeight: 900, color: "#192655", marginBottom: 16 },
  smallOptionRow: { background: "#f4f7ff", borderRadius: 18, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#556687", fontWeight: 800, marginBottom: 12 },
  teleCard: { background: "linear-gradient(135deg, #1e2f77 0%, #3347b6 100%)", borderRadius: 30, padding: 18, color: "#fff", position: "relative", minHeight: 240 },
  liveBadge: { display: "inline-flex", alignSelf: "flex-start", borderRadius: 999, padding: "8px 12px", background: "#16a34a", color: "#fff", fontWeight: 900, fontSize: 14 },
  teleTitle: { margin: "20px 0 10px", fontSize: 28, lineHeight: 1, fontWeight: 900 },
  teleText: { margin: 0, color: "rgba(255,255,255,0.78)", fontSize: 18, lineHeight: 1.5, maxWidth: 150 },
  darkCardButton: { marginTop: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 18, background: "#4164f6", color: "#fff", padding: "14px 18px", fontWeight: 900, textDecoration: "none", width: "fit-content" },
  shortCards: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 },
  shortInfoCard: { background: "#fff", borderRadius: 26, padding: 18, display: "grid", gap: 8, textDecoration: "none", color: "#1c2a58" },
  ctaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 },
  subscriptionCard: { background: "linear-gradient(135deg, #4164f6, #5e72ff)", borderRadius: 28, color: "#fff", padding: 22, textDecoration: "none", display: "grid", gap: 10 },
  emergencyCard: { background: "#e02c2c", borderRadius: 28, color: "#fff", padding: 22, textDecoration: "none", display: "grid", gap: 10 },
  popularTag: { display: "inline-flex", alignSelf: "flex-start", borderRadius: 999, padding: "6px 12px", border: "1px solid rgba(255,255,255,0.3)" },
  floatingCheckout: { position: "sticky", bottom: 96, display: "grid", gap: 4, background: "#4164f6", color: "#fff", textDecoration: "none", borderRadius: 24, padding: "16px 20px", boxShadow: "0 22px 48px rgba(47,89,255,0.28)", marginTop: 18, zIndex: 3 },
  topBackRow: { display: "flex", alignItems: "center", gap: 14, marginTop: 4 },
  pageTitle: { margin: 0, fontSize: 36, lineHeight: 1, color: "#192655", fontWeight: 900 },
  pageSubtitle: { margin: "10px 0 0", fontSize: 20, lineHeight: 1.45, color: "#7f8fb8", fontWeight: 600 },
  doctorHero: { marginTop: 22, borderRadius: 32, padding: 24, background: "linear-gradient(135deg, rgba(30,47,119,0.95), rgba(72,92,177,0.85))", color: "#fff" },
  whitePill: { display: "inline-flex", alignSelf: "flex-start", background: "#fff", color: "#4164f6", borderRadius: 999, padding: "8px 14px", fontWeight: 900 },
  doctorHeroTitle: { margin: "18px 0 12px", fontSize: 34, lineHeight: 1.15, fontWeight: 900 },
  heroStatRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  heroMiniStat: { background: "rgba(255,255,255,0.14)", borderRadius: 999, padding: "10px 14px", fontWeight: 800 },
  searchInput: { border: "none", outline: "none", flex: 1, fontSize: 18, background: "transparent", color: "#334155" },
  filterScroller: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, marginTop: 18 },
  specialtyChip: { minWidth: 112, borderRadius: 24, border: "1px solid #edf1fb", background: "#fff", padding: "16px 14px", fontWeight: 800, color: "#7f8fb8", cursor: "pointer" },
  specialtyChipActive: { borderColor: "#4164f6", boxShadow: "inset 0 0 0 2px #4164f6", color: "#4164f6" },
  filterBar: { display: "flex", gap: 12, overflowX: "auto", marginTop: 10, paddingBottom: 4 },
  softFilter: { borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", color: "#1e293b", padding: "14px 18px", fontWeight: 800, cursor: "pointer" },
  doctorCard: { background: "#fff", borderRadius: 30, padding: 18, display: "flex", gap: 16, textDecoration: "none", color: "#1c2a58", marginTop: 18 },
  doctorImage: { width: 128, minWidth: 128, height: 156, borderRadius: 22, background: "linear-gradient(135deg, #d9f1d5, #eef8ef)" },
  doctorCardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  doctorName: { margin: 0, fontSize: 24, fontWeight: 900, color: "#182554" },
  verifiedDot: { color: "#4164f6", fontWeight: 900, fontSize: 22 },
  doctorSpecialty: { color: "#4164f6", fontSize: 18, fontWeight: 900, marginTop: 4 },
  doctorMeta: { color: "#8492b3", fontSize: 17, marginTop: 6, fontWeight: 600 },
  doctorCardFooter: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12, color: "#182554" },
  availablePill: { borderRadius: 999, padding: "8px 14px", background: "#e9faef", color: "#16a34a", fontWeight: 900, fontSize: 14 },
  bookButtonLite: { display: "inline-flex", marginTop: 14, borderRadius: 20, border: "2px solid #c8f0d8", padding: "12px 16px", color: "#16a34a", fontWeight: 900, width: "fit-content" },
  profileHeroCard: { background: "#fff", borderRadius: 32, padding: 22, marginTop: 18 },
  doctorProfileTop: { display: "flex", gap: 18, alignItems: "flex-start" },
  profileImageLarge: { width: 142, minWidth: 142, height: 164, borderRadius: 26, background: "linear-gradient(135deg, #d9f1d5, #eef8ef)" },
  profileDoctorName: { margin: 0, fontSize: 26, lineHeight: 1.1, color: "#182554", fontWeight: 900 },
  doctorMetaBig: { margin: "10px 0 0", fontSize: 18, lineHeight: 1.5, color: "#7b89ab" },
  detailPillsRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  detailPill: { borderRadius: 999, padding: "10px 14px", background: "#f5f8ff", color: "#52617f", fontWeight: 800 },
  priceCallout: { textAlign: "right", color: "#1f2f56", display: "grid", gap: 4, fontWeight: 700 },
  locationInlineRow: { marginTop: 18, borderRadius: 22, background: "#f5f8ff", padding: "14px 18px", display: "flex", justifyContent: "space-between", gap: 12, color: "#5d6c8d", fontWeight: 800, flexWrap: "wrap" },
  whiteSectionCard: { background: "#fff", borderRadius: 32, padding: 22, marginTop: 18 },
  bodyTextLarge: { margin: "8px 0 0", fontSize: 19, lineHeight: 1.7, color: "#7182a6" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 },
  softInfoBox: { background: "#f5f8ff", borderRadius: 22, padding: 18, display: "grid", gap: 8, color: "#7182a6", fontSize: 18 },
  planOption: { borderRadius: 24, border: "2px solid #e4ebfb", background: "#fff", padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", marginTop: 12, color: "#1c2a58" },
  planOptionActive: { borderColor: "#4164f6", boxShadow: "0 0 0 2px rgba(65,100,246,0.08)" },
  planPriceWrap: { display: "grid", justifyItems: "end", gap: 6 },
  stickyFooter: { position: "sticky", bottom: 88, marginTop: 20, background: "rgba(247,249,255,0.94)", backdropFilter: "blur(12px)", paddingTop: 10, display: "flex", alignItems: "center", gap: 12 },
  stickyTitle: { fontSize: 18, color: "#172554", fontWeight: 900 },
  stickyMeta: { fontSize: 16, color: "#7f8fb8", fontWeight: 700, marginTop: 4 },
  footerCta: { border: "none", borderRadius: 24, background: "#4164f6", color: "#fff", padding: "18px 22px", fontSize: 20, fontWeight: 900, cursor: "pointer", textDecoration: "none", boxShadow: "0 18px 42px rgba(47,89,255,0.24)" },
  tabToggle: { display: "grid", gridTemplateColumns: "1fr 1fr", background: "#e9efff", borderRadius: 24, padding: 8, marginTop: 22 },
  tabToggleActive: { borderRadius: 18, background: "#4164f6", color: "#fff", padding: "16px 18px", textAlign: "center", fontWeight: 900, fontSize: 18 },
  tabToggleIdle: { borderRadius: 18, color: "#44506b", padding: "16px 18px", textAlign: "center", fontWeight: 900, fontSize: 18 },
  sectionInlineHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  onlineCount: { color: "#4164f6", fontSize: 18, fontWeight: 900 },
  specialtyGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 16 },
  specialtyTile: { borderRadius: 24, border: "2px solid #e3eafb", background: "#fff", padding: 18, color: "#5d6c8d", fontWeight: 800, display: "grid", gap: 12, justifyItems: "center", cursor: "pointer", minHeight: 146 },
  specialtyTileActive: { borderColor: "#b9cbff", background: "#f6f9ff", color: "#4164f6" },
  specialtyTileIcon: { width: 58, height: 58, borderRadius: 20, background: "#f5f8ff", display: "grid", placeItems: "center", fontSize: 22 },
  appointmentTabs: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 20 },
  appointmentTab: { borderRadius: 24, border: "2px solid #e1e8f7", background: "#fff", padding: "16px 18px", color: "#627296", fontWeight: 900, fontSize: 18, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" },
  appointmentTabActive: { background: "#4164f6", borderColor: "#4164f6", color: "#fff" },
  countBubble: { borderRadius: 999, padding: "6px 10px", background: "rgba(255,255,255,0.16)" },
  emptyStateTall: { minHeight: 420, display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center", gap: 12 },
  emptyGlyph: { width: 108, height: 108, borderRadius: 32, background: "#eef3ff", color: "#9fb0e0", display: "grid", placeItems: "center", fontSize: 46, fontWeight: 900 },
  emptyHeadline: { margin: 0, fontSize: 36, lineHeight: 1.1, color: "#192655", fontWeight: 900 },
  emptyCopy: { margin: 0, fontSize: 21, lineHeight: 1.5, color: "#7f8fb8", maxWidth: 320 },
  primaryEmptyAction: { marginTop: 8, borderRadius: 22, background: "#4164f6", color: "#fff", padding: "18px 24px", fontWeight: 900, textDecoration: "none", fontSize: 20 },
  appointmentCard: { background: "#fff", borderRadius: 24, padding: 18, display: "grid", gap: 8, color: "#50607f", marginTop: 14 },
  profileCenterHero: { display: "grid", justifyItems: "center", gap: 12, marginTop: 40 },
  profileAvatar: { width: 112, height: 112, borderRadius: 34, background: "#eef3ff", color: "#4164f6", display: "grid", placeItems: "center", fontSize: 48, fontWeight: 900 },
  profileHeroTitle: { margin: 0, fontSize: 36, color: "#192655", fontWeight: 900 },
  menuPanel: { marginTop: 26, background: "#fff", borderRadius: 30, overflow: "hidden" },
  menuRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 20px", borderTop: "1px solid #eef2fb", color: "#192655", textDecoration: "none" },
  pharmacyTopBanner: { background: "#2949d3", margin: "0 -18px", padding: "12px 18px 22px" },
  pharmacyTopRow: { display: "flex", gap: 12, alignItems: "center" },
  pharmacyBack: { width: 58, height: 58, borderRadius: 20, border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 26, display: "grid", placeItems: "center", cursor: "pointer" },
  deliveryLabel: { color: "#dce5ff", fontWeight: 800, fontSize: 16 },
  deliveryChip: { marginTop: 8, display: "inline-flex", borderRadius: 999, background: "rgba(255,255,255,0.14)", color: "#fff", padding: "10px 14px", fontWeight: 800 },
  pharmacySearchPanel: { marginTop: 18, background: "#fff", borderRadius: 28, padding: "18px 20px", display: "flex", justifyContent: "space-between", gap: 12, color: "#7f8fb8", fontSize: 18, alignItems: "center" },
  blueBannerCard: { marginTop: 20, borderRadius: 32, padding: 22, background: "linear-gradient(135deg, #4b63ff, #5f73ff)", color: "#fff" },
  productGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  productCard: { background: "#fff", borderRadius: 28, padding: 18, display: "grid", gap: 10, boxShadow: "0 14px 30px rgba(65,100,246,0.06)" },
  productVisual: { height: 170, borderRadius: 20, display: "grid", placeItems: "center", fontSize: 54, fontWeight: 900, color: "#2f59ff" },
  productName: { fontSize: 22, lineHeight: 1.25, color: "#182554", fontWeight: 900 },
  productSub: { fontSize: 18, color: "#7f8fb8", fontWeight: 600 },
  priceLine: { display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", color: "#7f8fb8" },
  stockLine: { color: "#16a34a", fontSize: 16, fontWeight: 900 },
  qtyControl: { display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 20, border: "2px solid #cfe0ff", padding: "12px 16px", fontWeight: 900, color: "#1f2f56" },
  qtyButton: { width: 32, height: 32, border: "none", background: "transparent", color: "#4164f6", fontSize: 28, cursor: "pointer" },
  addCartButton: { border: "none", borderRadius: 20, background: "#4164f6", color: "#fff", padding: "16px 18px", fontWeight: 900, fontSize: 18, cursor: "pointer" },
  cartRow: { background: "#fff", borderRadius: 28, padding: 18, display: "flex", gap: 16, alignItems: "flex-start", marginTop: 14 },
  cartTitle: { fontSize: 24, lineHeight: 1.25, color: "#182554", fontWeight: 900 },
  removeLink: { border: "none", background: "transparent", color: "#64748b", fontWeight: 800, cursor: "pointer" },
  summaryRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 12, color: "#5f6f90", fontSize: 18, fontWeight: 700 },
  orderCard: { background: "#fff", borderRadius: 28, padding: 18, display: "grid", gap: 8, marginTop: 16, color: "#5f6f90" },
};
