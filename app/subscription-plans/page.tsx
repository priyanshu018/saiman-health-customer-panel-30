import type { Metadata } from "next";
import { WebSubscriptionPlansScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Subscription Plans",
  description: "Compare membership plans and choose the coverage that fits your family's needs.",
};

export default function SubscriptionPlansPage() {
  return <WebSubscriptionPlansScreen />;
}
