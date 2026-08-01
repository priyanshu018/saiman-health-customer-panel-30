import type { Metadata } from "next";
import { WebHealthCardScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Health Card",
  description: "Manage your Saiman Healthcare membership and family health card.",
};

export default function HealthCardPage() {
  return <WebHealthCardScreen />;
}
