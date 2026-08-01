import type { Metadata } from "next";
import { WebCtmriScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "CT / MRI Scans",
  description: "Compare scan prices, locations, and available diagnostic centers.",
};

export default function CtmriPage() {
  return <WebCtmriScreen />;
}
