import type { Metadata } from "next";
import { WebCareStaffScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Home Care & Staffing",
  description: "Trained nurses, caregivers, and support professionals for recovery and elder care at home.",
};

export default function CareStaffPage() {
  return <WebCareStaffScreen />;
}
