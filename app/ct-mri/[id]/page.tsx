import { WebCtmriDetailScreen } from "@/components/web-app-experience";

export default async function CtmriDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WebCtmriDetailScreen serviceId={id} />;
}
