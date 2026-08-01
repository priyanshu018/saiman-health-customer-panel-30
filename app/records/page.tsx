import type { Metadata } from "next";
import { WebRecordsScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Records",
  description: "Keep prescriptions, reports, and consultation summaries together in one place.",
};

export default function RecordsPage() {
  return <WebRecordsScreen />;
}
