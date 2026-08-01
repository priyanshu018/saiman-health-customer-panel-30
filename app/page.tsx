"use client";

import { useCustomerUser } from "@/components/customer-live";
import { CustomerLandingPage } from "@/components/customer-site-pages";
import { WebHomeScreen } from "@/components/web-app-experience";

export default function HomePage() {
  const { user, state } = useCustomerUser();

  // While the session check is in flight, default to the public marketing
  // page rather than a blank screen — most visitors are logged out, and
  // WebHomeScreen would just render its own logged-out state anyway.
  if (!state.loading && user) {
    return <WebHomeScreen />;
  }

  return <CustomerLandingPage />;
}
