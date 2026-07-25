import Link from "next/link";
import { CustomerAuthForm } from "@/components/customer-live";

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="eyebrow">Saiman Health Access</p>
        <h1>Login to your care account</h1>
        <p>Use the same customer identity across appointments, pharmacy, diagnostics, and emergency support.</p>
        <CustomerAuthForm mode="login" />
        <div style={{ marginTop: 16 }}>
          <Link href="/" className="pill-link">Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
