import { CustomerShell } from "@/components/customer-shell";
import { LiveInstantCallPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function InstantCallPage() {
  return (
    <CustomerShell title="Instant Call" subtitle="Fast doctor-connect surface for urgent consultations and quick health guidance.">
      <SectionBlock title="Urgent Consultation Flow" subtitle="This web page uses the same instant-call request table and RPC flow as the customer app.">
        <LiveInstantCallPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
