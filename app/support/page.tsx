import type { Metadata } from "next";
import { CustomerSupportHubPage } from "@/components/customer-site-pages";

export const metadata: Metadata = {
  title: "Support",
  description: "Raise a ticket, track responses, and get help from the Saiman Healthcare care team.",
};

export default function SupportPage() {
  return <CustomerSupportHubPage />;
}
