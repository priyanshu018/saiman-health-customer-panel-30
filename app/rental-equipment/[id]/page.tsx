import { WebRentalEquipmentDetailScreen } from "@/components/web-app-experience";

export default async function RentalEquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebRentalEquipmentDetailScreen equipmentId={id} />;
}
