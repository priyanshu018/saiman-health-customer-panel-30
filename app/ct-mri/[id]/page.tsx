import type { Metadata } from "next";
import { WebCtmriDetailScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Imaging Scan Details",
  description: "Review CT / MRI scan details and book an appointment at a verified diagnostic center.",
};

export default async function CtmriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebCtmriDetailScreen serviceId={id} />;
}
