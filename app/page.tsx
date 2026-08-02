"use client";

import { useCustomerUser } from "@/components/customer-live";
import { CustomerLandingPage } from "@/components/customer-site-pages";
import { WebHomeScreen } from "@/components/web-app-experience";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  const { user, state } = useCustomerUser();

  // Keep the portal shell visible while the customer session is resolving so
  // authenticated users don't briefly flash back to the public landing page
  // when they click Dashboard/logo to return home.
  if (state.loading) {
    return (
      <div className="app-shell">
        <SiteHeader mode="portal" />
        <div style={{ minHeight: "calc(100vh - 84px)", padding: "32px" }}>
          <div
            style={{
              maxWidth: 1240,
              margin: "0 auto",
              borderRadius: 28,
              border: "1px solid var(--line)",
              background: "var(--surface-strong)",
              boxShadow: "var(--shadow-card)",
              padding: "28px 32px",
              color: "var(--brand-deep)",
            }}
          >
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <WebHomeScreen />;
  }

  return <CustomerLandingPage />;
}
