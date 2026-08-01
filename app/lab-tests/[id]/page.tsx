import type { Metadata } from "next";
import { WebLabTestDetailScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Lab Test Details",
  description: "Review lab test details, choose home collection or a center visit, and book securely.",
};

export default async function LabTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebLabTestDetailScreen testId={id} />;
}
