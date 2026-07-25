import Link from "next/link";
import { Suspense } from "react";
import { CustomerAuthForm } from "@/components/customer-live";

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-layout">
        <section className="auth-hero">
          <span className="state-badge">Customer Signup</span>
          <h1>Create your Saiman Health account</h1>
          <p>
            Set up one secure customer identity for consultations, medicine orders, diagnostics, hospitals,
            ambulance help, and future records across the same shared Saiman system.
          </p>
          <div className="auth-highlight-grid">
            <div className="auth-highlight-card">
              <strong>One profile</strong>
              <span>Use one account across every patient-facing service.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Verified partners</strong>
              <span>See the same approved doctors, labs, and pharmacies as the app.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Faster care</strong>
              <span>Book, pay, and follow care journeys without repeating your details.</span>
            </div>
          </div>
        </section>

        <div className="auth-card">
          <p className="eyebrow">New Customer</p>
          <h1>Create your Saiman Health account</h1>
          <p>Set up one customer profile for consultations, orders, tests, hospitals, and emergency flows.</p>
          <Suspense fallback={<div className="inline-alert">Loading signup form...</div>}>
            <CustomerAuthForm mode="signup" />
          </Suspense>
          <div style={{ marginTop: 16 }}>
            <Link href="/auth/login" className="pill-link">Already have an account? Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
