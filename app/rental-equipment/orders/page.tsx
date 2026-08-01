import type { Metadata } from "next";
import { WebRentalOrdersScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Rental Orders",
  description: "Track your equipment rentals from delivery to return.",
};

export default function RentalOrdersPage() {
  return <WebRentalOrdersScreen />;
}
