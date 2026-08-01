import type { Metadata } from "next";
import { WebStaffingRequestScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Request Care Staff",
  description: "Tell us the type of support your patient needs and get matched with a qualified professional.",
};

export default function CareStaffRequestPage() {
  return <WebStaffingRequestScreen />;
}
