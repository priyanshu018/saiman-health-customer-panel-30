import Link from "next/link";
import { Suspense } from "react";
import { CustomerAuthForm } from "@/components/customer-live";

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-layout">
        <section className="auth-hero">
          <span className="state-badge">Customer Login</span>
          <h1>Welcome back to Saiman Health</h1>
          <p>
            Sign in with the same customer account you use in the mobile app to open appointments, pharmacy,
            diagnostics, hospitals, records, and instant doctor calls.
          </p>
          <div className="auth-highlight-grid">
            <div className="auth-highlight-card">
              <strong>Appointments</strong>
              <span>Track consultations and bookings in one place.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Digital records</strong>
              <span>Keep reports, prescriptions, and history together.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Urgent support</strong>
              <span>Start an instant doctor call when you need help fast.</span>
            </div>
          </div>
        </section>

        <div className="auth-card">
          <p className="eyebrow">Saiman Health Access</p>
          <h1>Login to your care account</h1>
          <p>Use the same customer identity across appointments, pharmacy, diagnostics, and emergency support.</p>
          <Suspense fallback={<div className="inline-alert">Loading login form...</div>}>
            <CustomerAuthForm mode="login" />
          </Suspense>
          <div style={{ marginTop: 16 }}>
            <Link href="/auth/signup" className="pill-link">Need an account? Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
