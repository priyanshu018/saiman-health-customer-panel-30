import type { Metadata } from "next";
import { WebHospitalRequestsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Hospital Requests",
  description: "Track your hospital consultation requests and their status.",
};

export default function HospitalRequestsPage() {
  return <WebHospitalRequestsScreen />;
}
