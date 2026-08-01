import type { Metadata } from "next";
import { WebProfileScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your profile, appointments, records, and support requests from one place.",
};

export default function ProfilePage() {
  return <WebProfileScreen />;
}
