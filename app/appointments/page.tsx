import type { Metadata } from "next";
import { WebAppointmentsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "My Appointments",
  description: "Manage upcoming consultations, track status, and review your visit history.",
};

export default function AppointmentsPage() {
  return <WebAppointmentsScreen />;
}
