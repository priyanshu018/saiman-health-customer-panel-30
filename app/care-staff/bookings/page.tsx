import type { Metadata } from "next";
import { WebStaffingBookingsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Care Staff Requests",
  description: "Track the status of your home-care and staffing requests, from submission to assignment.",
};

export default function CareStaffBookingsPage() {
  return <WebStaffingBookingsScreen />;
}
