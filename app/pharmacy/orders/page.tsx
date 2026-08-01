import type { Metadata } from "next";
import { WebPharmacyOrdersScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "My Pharmacy Orders",
  description: "Track your medicine orders from confirmation to delivery.",
};

export default function PharmacyOrdersPage() {
  return <WebPharmacyOrdersScreen />;
}
