import type { Metadata } from "next";
import { WebHospitalDetailScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Hospital Service Details",
  description: "Review hospital service details and request a consultation.",
};

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebHospitalDetailScreen serviceId={id} />;
}
