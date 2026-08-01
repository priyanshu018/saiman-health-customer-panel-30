import type { Metadata } from "next";
import { WebLabBookingsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Lab Test Bookings",
  description: "Track your diagnostic test bookings from confirmation to report.",
};

export default function LabBookingsPage() {
  return <WebLabBookingsScreen />;
}
