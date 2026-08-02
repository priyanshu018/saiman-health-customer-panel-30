import type { Metadata } from "next";
import { WebLabCompareScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Compare Lab Tests",
  description: "Compare approved lab providers, pricing, and report times for your selected tests.",
};

export default function LabTestsComparePage() {
  return <WebLabCompareScreen />;
}
