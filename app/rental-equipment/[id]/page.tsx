import type { Metadata } from "next";
import { WebRentalEquipmentDetailScreen } from "@/components/web-app-experience";

export const metadata: Metadata = {
  title: "Rental Equipment Details",
  description: "Review equipment details, compare rental plans, and book delivery.",
};

export default async function RentalEquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebRentalEquipmentDetailScreen equipmentId={id} />;
}
