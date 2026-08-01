import type { Metadata } from "next";
import { WebDoctorDetailScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Doctor Profile",
  description: "Review doctor details, choose a consultation plan, and book securely.",
};

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebDoctorDetailScreen doctorId={id} />;
}
