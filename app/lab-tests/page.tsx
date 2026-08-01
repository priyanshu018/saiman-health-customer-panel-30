import type { Metadata } from "next";
import { WebLabTestsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Lab Tests",
  description: "Search diagnostic tests, compare lab prices, and choose home collection or a center visit.",
};

export default function LabTestsPage() {
  return <WebLabTestsScreen />;
}
