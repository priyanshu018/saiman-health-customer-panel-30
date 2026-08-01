import { WebLabTestDetailScreen } from "@/components/web-app-experience";

export default async function LabTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebLabTestDetailScreen testId={id} />;
}
