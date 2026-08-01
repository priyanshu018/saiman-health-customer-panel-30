import type { Metadata } from "next";
import { WebPharmacyScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Pharmacy",
  description: "Order medicines from verified pharmacies with doorstep delivery.",
};

export default function PharmacyPage() {
  return <WebPharmacyScreen />;
}
