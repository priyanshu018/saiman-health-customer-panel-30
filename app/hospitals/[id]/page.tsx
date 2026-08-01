import { WebHospitalDetailScreen } from "@/components/web-app-experience";

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebHospitalDetailScreen serviceId={id} />;
}
