import type { Metadata } from "next";
import { WebDoctorsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Doctor Consultation",
  description: "Find verified specialists, compare consultation fees, and book an appointment online or in-clinic.",
};

export default function DoctorsPage() {
  return <WebDoctorsScreen />;
}
