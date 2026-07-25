import Link from "next/link";
import { CustomerAuthForm } from "@/components/customer-live";

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="eyebrow">New Customer</p>
        <h1>Create your Saiman Health account</h1>
        <p>Set up one customer profile for consultations, orders, tests, hospitals, and emergency flows.</p>
        <CustomerAuthForm mode="signup" />
        <div style={{ marginTop: 16 }}>
          <Link href="/" className="pill-link">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
