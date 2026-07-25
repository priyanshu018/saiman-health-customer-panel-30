import { WebDoctorDetailScreen } from "@/components/web-app-experience";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebDoctorDetailScreen doctorId={id} />;
}
