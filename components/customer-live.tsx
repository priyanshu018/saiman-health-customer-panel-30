"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import type {
  AppointmentSummary,
  AuthUserSummary,
  CustomerProfileSummary,
  DoctorSummary,
  HospitalSummary,
  InstantCallSummary,
  LabTestSummary,
  PharmacySummary,
  SupportTicketSummary,
} from "@/lib/customer-web-live";
import {
  createSupportTicket,
  fetchActiveInstantCallRequest,
  fetchApprovedDoctors,
  fetchApprovedHospitals,
  fetchApprovedLabTests,
  fetchApprovedPharmacies,
  fetchCustomerProfile,
  fetchPatientAppointments,
  fetchSupportTickets,
  getCurrentCustomer,
  loginCustomer,
  logoutCustomer,
  requestInstantCall,
  signupCustomer,
} from "@/lib/customer-web-live";
import { getSupabaseEnv } from "@/lib/supabase-browser";

type LoadState = {
  loading: boolean;
  error: string;
};

function formatDateTime(value?: string) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateLabel(date: string, time: string) {
  const iso = time ? `${date}T${time}` : date;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`.trim();
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p className="meta-text">{detail}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return <div className="inline-alert error">{message}</div>;
}

function InlineInfo({ message }: { message: string }) {
  return <div className="inline-alert">{message}</div>;
}

function useCustomerUser() {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const env = getSupabaseEnv();
  const [state, setState] = useState<LoadState>({
    loading: env.configured,
    error: "",
  });

  useEffect(() => {
    let active = true;

    if (!env.configured) {
      return () => {
        active = false;
      };
    }

    getCurrentCustomer()
      .then((result) => {
        if (!active) return;
        setUser(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load customer session.",
        });
      });

    return () => {
      active = false;
    };
  }, [env.configured]);

  return { user, setUser, state, configured: env.configured };
}

export function CustomerShellAuthActions() {
  const router = useRouter();
  const { user, setUser, state, configured } = useCustomerUser();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logoutCustomer();
      setUser(null);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!configured) {
    return <span className="status-chip">Add Supabase env to activate live mode</span>;
  }

  if (state.loading) {
    return <span className="status-chip">Checking session...</span>;
  }

  if (user) {
    return (
      <>
        <span className="status-chip">{user.name}</span>
        <button className="ghost-button" type="button" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? "Signing out..." : "Logout"}
        </button>
      </>
    );
  }

  return (
    <>
      <Link href="/auth/login" className="ghost-button">
        Login
      </Link>
      <Link href="/auth/signup" className="primary-button">
        Create Account
      </Link>
    </>
  );
}

export function CustomerAuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const env = getSupabaseEnv();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSubmitting(true);
      await loginCustomer(loginForm.email, loginForm.password);
      setSuccess("Login successful. Redirecting to your dashboard...");
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    try {
      setSubmitting(true);
      await signupCustomer({
        name: signupForm.name,
        phone: signupForm.phone,
        email: signupForm.email,
        password: signupForm.password,
      });
      setSuccess(
        "Account created successfully. If email confirmation is enabled in Supabase, verify your inbox before login.",
      );
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!env.configured) {
    return (
      <InlineError message="Supabase is not configured for this web app yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." />
    );
  }

  if (mode === "login") {
    return (
      <form className="form-grid" onSubmit={handleLogin}>
        {error ? <InlineError message={error} /> : null}
        {success ? <InlineInfo message={success} /> : null}
        <div className="field">
          <label>Email</label>
          <input
            value={loginForm.email}
            onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Enter registered email"
            type="email"
            required
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            value={loginForm.password}
            onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            type="password"
            placeholder="Enter password"
            required
          />
        </div>
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Login"}
        </button>
        <Link href="/auth/signup" className="ghost-button">
          Create new account
        </Link>
      </form>
    );
  }

  return (
    <form className="form-grid" onSubmit={handleSignup}>
      {error ? <InlineError message={error} /> : null}
      {success ? <InlineInfo message={success} /> : null}
      <div className="dual-grid">
        <div className="field">
          <label>Full name</label>
          <input
            value={signupForm.name}
            onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Rahul Sharma"
            required
          />
        </div>
        <div className="field">
          <label>Mobile number</label>
          <input
            value={signupForm.phone}
            onChange={(event) => setSignupForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="+91 98765 43210"
            required
          />
        </div>
      </div>
      <div className="field">
        <label>Email</label>
        <input
          value={signupForm.email}
          onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="rahul@example.com"
          type="email"
          required
        />
      </div>
      <div className="dual-grid">
        <div className="field">
          <label>Password</label>
          <input
            value={signupForm.password}
            onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
            type="password"
            placeholder="Create password"
            required
          />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input
            value={signupForm.confirmPassword}
            onChange={(event) =>
              setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
            type="password"
            placeholder="Confirm password"
            required
          />
        </div>
      </div>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Account"}
      </button>
      <Link href="/auth/login" className="ghost-button">
        Already have an account?
      </Link>
    </form>
  );
}

function LiveCollectionState({
  state,
  empty,
  children,
}: {
  state: LoadState;
  empty?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (state.loading) {
    return <InlineInfo message="Loading live data..." />;
  }
  if (state.error) {
    return <InlineError message={state.error} />;
  }
  return <>{children || empty}</>;
}

export function LiveDoctorsPanel() {
  const [items, setItems] = useState<DoctorSummary[]>([]);
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetchApprovedDoctors()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load doctors." });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LiveCollectionState
      state={state}
      empty={<EmptyState title="No approved doctors yet" detail="Approved doctors from the mobile app database will appear here automatically." />}
    >
      {items.length ? (
        <div className="card-grid three">
          {items.map((doctor) => (
            <div key={doctor.id} className="plan-card">
              <strong>{doctor.name}</strong>
              <p className="meta-text" style={{ marginTop: 8 }}>{doctor.specialty}</p>
              <p className="meta-text" style={{ marginTop: 8 }}>{doctor.hospital}</p>
              <div className="meta-row" style={{ marginTop: 16 }}>
                <span>{doctor.city}</span>
                <span>₹{doctor.fee}</span>
              </div>
              <div className="pill-row" style={{ marginTop: 16 }}>
                <span className="status-chip">⭐ {doctor.rating.toFixed(1)}</span>
                <span className="pill-link">{doctor.availability.join(" · ")}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LiveCollectionState>
  );
}

export function LivePharmacyPanel() {
  const [items, setItems] = useState<PharmacySummary[]>([]);
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetchApprovedPharmacies()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load pharmacies." });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LiveCollectionState
      state={state}
      empty={<EmptyState title="No approved pharmacies yet" detail="Approved pharmacy partners will appear here from the same shared backend." />}
    >
      {items.length ? (
        <div className="card-grid three">
          {items.map((item) => (
            <div key={item.id} className="plan-card">
              <strong>{item.name}</strong>
              <p className="meta-text" style={{ marginTop: 8 }}>{item.address}</p>
              <div className="meta-row" style={{ marginTop: 16 }}>
                <span>{item.city}</span>
                <span>{item.eta}</span>
              </div>
              <div className="pill-row" style={{ marginTop: 16 }}>
                <span className="status-chip">⭐ {item.rating.toFixed(1)}</span>
                <span className="pill-link">Approved partner</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LiveCollectionState>
  );
}

export function LiveLabTestsPanel() {
  const [items, setItems] = useState<LabTestSummary[]>([]);
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetchApprovedLabTests()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load lab tests." });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LiveCollectionState
      state={state}
      empty={<EmptyState title="No approved lab tests yet" detail="Once lab approvals exist in Supabase, they will populate here for web customers too." />}
    >
      {items.length ? (
        <div className="card-grid three">
          {items.map((item) => (
            <div key={item.id} className="plan-card">
              <strong>{item.name}</strong>
              <p className="meta-text" style={{ marginTop: 8 }}>{item.labName}</p>
              <div className="meta-row" style={{ marginTop: 16 }}>
                <span>{item.category}</span>
                <span>₹{item.price}</span>
              </div>
              <div className="meta-row" style={{ marginTop: 8 }}>
                <span>{item.city}</span>
                <span>{item.reportTime}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LiveCollectionState>
  );
}

export function LiveHospitalsPanel() {
  const [items, setItems] = useState<HospitalSummary[]>([]);
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    fetchApprovedHospitals()
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load hospitals." });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <LiveCollectionState
      state={state}
      empty={<EmptyState title="No approved hospitals yet" detail="Approved hospitals from the mobile provider flow will show up here automatically." />}
    >
      {items.length ? (
        <div className="card-grid three">
          {items.map((item) => (
            <div key={item.id} className="plan-card">
              <strong>{item.name}</strong>
              <p className="meta-text" style={{ marginTop: 8 }}>{item.address}</p>
              <div className="meta-row" style={{ marginTop: 16 }}>
                <span>{item.city}</span>
                <span>{item.totalBeds ? `${item.totalBeds} beds` : "Beds on request"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LiveCollectionState>
  );
}

export function LiveAppointmentsPanel() {
  const { user, state: authState, configured } = useCustomerUser();
  const [items, setItems] = useState<AppointmentSummary[]>([]);
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    if (!configured || !user?.id) {
      return () => {
        active = false;
      };
    }

    fetchPatientAppointments(user.id)
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load appointments." });
      });

    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  if (!configured) {
    return <InlineError message="Supabase env is missing for live appointment access." />;
  }
  if (authState.loading) {
    return <InlineInfo message="Checking your customer session..." />;
  }
  if (!user) {
    return <EmptyState title="Login required" detail="Sign in with the same customer account you use in the mobile app to view booked appointments." action={<Link href="/auth/login" className="primary-button">Login</Link>} />;
  }

  return (
    <LiveCollectionState
      state={state}
      empty={<EmptyState title="No appointments yet" detail="Doctor appointments booked from the app or the web will appear here." />}
    >
      {items.length ? (
        <div className="list-stack">
          {items.map((item) => (
            <div key={item.id} className="plan-card">
              <strong>{item.doctorName}</strong>
              <p className="meta-text" style={{ marginTop: 8 }}>{item.doctorSpecialty}</p>
              <div className="meta-row" style={{ marginTop: 16 }}>
                <span>{formatDateLabel(item.appointmentDate, item.appointmentTime)}</span>
                <span className="status-chip">{item.status}</span>
              </div>
              <div className="meta-row" style={{ marginTop: 8 }}>
                <span>{item.consultationType}</span>
                <span>₹{item.fee}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LiveCollectionState>
  );
}

export function LiveProfilePanel() {
  const { user, state: authState, configured } = useCustomerUser();
  const [profile, setProfile] = useState<CustomerProfileSummary | null>(null);
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });

  useEffect(() => {
    let active = true;
    if (!configured || !user?.id) {
      return () => {
        active = false;
      };
    }

    fetchCustomerProfile(user.id)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load profile." });
      });

    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  if (!configured) {
    return <InlineError message="Supabase env is missing for profile access." />;
  }
  if (authState.loading) {
    return <InlineInfo message="Checking your customer session..." />;
  }
  if (!user) {
    return <EmptyState title="Login required" detail="Login to open the same customer profile data used in the mobile app." action={<Link href="/auth/login" className="primary-button">Login</Link>} />;
  }

  return (
    <LiveCollectionState state={state}>
      {profile ? (
        <div className="card-grid two">
          <div className="plan-card">
            <strong>{profile.name}</strong>
            <p className="meta-text" style={{ marginTop: 10 }}>{profile.email || "Email not available"}</p>
            <div className="meta-row" style={{ marginTop: 16 }}>
              <span>{profile.phone || "Phone not available"}</span>
              <span>{profile.city || "City not available"}</span>
            </div>
            <div className="meta-row" style={{ marginTop: 8 }}>
              <span>Ayushman ID</span>
              <span>{profile.ayushmanHealthId || "Not added"}</span>
            </div>
          </div>
          <div className="plan-card">
            <strong>Customer activity</strong>
            <div className="records-grid" style={{ marginTop: 16 }}>
              <div className="metric-row">
                <span className="meta-text">Consultations</span>
                <strong style={{ marginTop: 10 }}>{profile.consultations}</strong>
              </div>
              <div className="metric-row">
                <span className="meta-text">Doctors</span>
                <strong style={{ marginTop: 10 }}>{profile.doctors}</strong>
              </div>
              <div className="metric-row">
                <span className="meta-text">Reports</span>
                <strong style={{ marginTop: 10 }}>{profile.reports}</strong>
              </div>
            </div>
            <div className="meta-row" style={{ marginTop: 16 }}>
              <span>Language: {profile.preferredLanguage === "hi" ? "Hindi" : "English"}</span>
              <span>{profile.pushNotificationsEnabled ? "Notifications on" : "Notifications off"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </LiveCollectionState>
  );
}

export function LiveSupportPanel() {
  const { user, state: authState, configured } = useCustomerUser();
  const [items, setItems] = useState<SupportTicketSummary[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Booking help");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });
  const [submitState, setSubmitState] = useState({ loading: false, message: "", error: "" });

  useEffect(() => {
    let active = true;
    if (!configured || !user?.id) {
      return () => {
        active = false;
      };
    }

    fetchSupportTickets(user.id)
      .then((result) => {
        if (!active) return;
        setItems(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load support tickets." });
      });

    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setSubmitState({ loading: true, message: "", error: "" });
    try {
      await createSupportTicket({
        userId: user.id,
        userEmail: user.email,
        subject,
        category,
        message,
      });
      const refreshed = await fetchSupportTickets(user.id);
      setItems(refreshed);
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

  if (!configured) {
    return <InlineError message="Supabase env is missing for support access." />;
  }
  if (authState.loading) {
    return <InlineInfo message="Checking your customer session..." />;
  }
  if (!user) {
    return <EmptyState title="Login required" detail="Use the same customer account to raise support tickets and review prior conversations." action={<Link href="/auth/login" className="primary-button">Login</Link>} />;
  }

  return (
    <div className="card-grid two">
      <div className="plan-card">
        <strong>Your support tickets</strong>
        <div style={{ marginTop: 16 }}>
          <LiveCollectionState
            state={state}
            empty={<EmptyState title="No support tickets yet" detail="Once you raise a support issue, it will appear here with the same shared status flow." />}
          >
            {items.length ? (
              <div className="list-stack">
                {items.map((item) => (
                  <div key={item.id} className="list-card">
                    <strong>{item.subject}</strong>
                    <div className="meta-row" style={{ marginTop: 8 }}>
                      <span>{item.category}</span>
                      <span className="status-chip">{item.status}</span>
                    </div>
                    <div className="meta-row" style={{ marginTop: 8 }}>
                      <span>{item.priority}</span>
                      <span>{formatDateTime(item.lastMessageAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </LiveCollectionState>
        </div>
      </div>

      <div className="plan-card">
        <strong>Raise a ticket</strong>
        <form className="form-grid" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
          {submitState.error ? <InlineError message={submitState.error} /> : null}
          {submitState.message ? <InlineInfo message={submitState.message} /> : null}
          <div className="field">
            <label>Subject</label>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Describe the issue" required />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Booking help</option>
              <option>Payments and refunds</option>
              <option>Prescription and report access</option>
              <option>Emergency dispatch support</option>
              <option>Health card verification</option>
            </select>
          </div>
          <div className="field">
            <label>Details</label>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Share booking ids, symptoms, payment concerns, or support context" required />
          </div>
          <button className="primary-button" type="submit" disabled={submitState.loading}>
            {submitState.loading ? "Submitting..." : "Submit Support Request"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function LiveInstantCallPanel() {
  const { user, state: authState, configured } = useCustomerUser();
  const [request, setRequest] = useState<InstantCallSummary | null>(null);
  const [specialty, setSpecialty] = useState("General Physician");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState("English");
  const [state, setState] = useState<LoadState>({ loading: true, error: "" });
  const [submitState, setSubmitState] = useState({ loading: false, message: "", error: "" });

  useEffect(() => {
    let active = true;
    if (!configured || !user?.id) {
      return () => {
        active = false;
      };
    }

    fetchActiveInstantCallRequest(user.id)
      .then((result) => {
        if (!active) return;
        setRequest(result);
        setState({ loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({ loading: false, error: error instanceof Error ? error.message : "Unable to load instant call state." });
      });

    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ loading: true, message: "", error: "" });
    try {
      await requestInstantCall({
        specialty,
        callReason: reason,
        notes,
        preferredLanguage: language,
      });
      if (user?.id) {
        const refreshed = await fetchActiveInstantCallRequest(user.id);
        setRequest(refreshed);
      }
      setReason("");
      setNotes("");
      setSubmitState({ loading: false, message: "Instant call request created successfully.", error: "" });
    } catch (error) {
      setSubmitState({
        loading: false,
        message: "",
        error: error instanceof Error ? error.message : "Unable to create instant call request.",
      });
    }
  }

  if (!configured) {
    return <InlineError message="Supabase env is missing for instant-call access." />;
  }
  if (authState.loading) {
    return <InlineInfo message="Checking your customer session..." />;
  }
  if (!user) {
    return <EmptyState title="Login required" detail="Sign in with your customer account before starting an instant doctor call request." action={<Link href="/auth/login" className="primary-button">Login</Link>} />;
  }

  return (
    <div className="card-grid two">
      <div className="plan-card">
        <strong>Start a request</strong>
        <form className="form-grid" style={{ marginTop: 16 }} onSubmit={handleSubmit}>
          {submitState.error ? <InlineError message={submitState.error} /> : null}
          {submitState.message ? <InlineInfo message={submitState.message} /> : null}
          <div className="field">
            <label>Specialty</label>
            <select value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
              <option>General Physician</option>
              <option>Cardiologist</option>
              <option>Neurologist</option>
              <option>Paediatrician</option>
              <option>Dermatologist</option>
            </select>
          </div>
          <div className="field">
            <label>Call reason</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the urgent health concern" required />
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Symptoms, family context, medicines already taken, or anything the doctor should know" />
          </div>
          <div className="field">
            <label>Preferred language</label>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Telugu</option>
              <option>Tamil</option>
            </select>
          </div>
          <button className="primary-button" type="submit" disabled={submitState.loading}>
            {submitState.loading ? "Requesting..." : "Request Instant Call"}
          </button>
        </form>
      </div>

      <div className="plan-card">
        <strong>Current queue state</strong>
        <div style={{ marginTop: 16 }}>
          <LiveCollectionState state={state}>
            {request ? (
              <div className="list-stack">
                <div className="list-card">
                  <strong>{request.specialty}</strong>
                  <p className="meta-text" style={{ marginTop: 8 }}>{request.callReason}</p>
                  <div className="meta-row" style={{ marginTop: 12 }}>
                    <span>{formatDateTime(request.createdAt)}</span>
                    <span className="status-chip">{request.status}</span>
                  </div>
                </div>
                {request.statusMessage ? (
                  <div className="list-card">
                    <strong>Status update</strong>
                    <p className="meta-text" style={{ marginTop: 8 }}>{request.statusMessage}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="No active instant call request" detail="Once you raise a live request, the doctor assignment and call progress status will appear here." />
            )}
          </LiveCollectionState>
        </div>
      </div>
    </div>
  );
}
