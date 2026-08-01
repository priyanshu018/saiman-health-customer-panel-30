import type { Metadata } from "next";
import { WebPharmacyCartScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your medicine cart and check out securely.",
};

export default function PharmacyCartPage() {
  return <WebPharmacyCartScreen />;
}
