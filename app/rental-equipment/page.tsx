import type { Metadata } from "next";
import { WebRentalEquipmentScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Rental Equipment",
  description: "Browse patient-care equipment and compare rental pricing for home recovery.",
};

export default function RentalEquipmentPage() {
  return <WebRentalEquipmentScreen />;
}
