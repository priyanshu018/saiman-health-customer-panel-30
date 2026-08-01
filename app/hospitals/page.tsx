import type { Metadata } from "next";
import { WebHospitalsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Hospitals & Surgeries",
  description: "Browse verified hospitals and surgery centers, compare specialties, and request a consultation.",
};

export default function HospitalsPage() {
  return <WebHospitalsScreen />;
}
