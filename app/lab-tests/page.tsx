import { CustomerShell } from "@/components/customer-shell";
import { LiveLabTestsPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function LabTestsPage() {
  return (
    <CustomerShell title="Lab Tests" subtitle="Search diagnostics, compare prices, and track report delivery from the web panel.">
      <SectionBlock title="Popular Tests" subtitle="Mirrors the compare-and-book lab experience from the customer app.">
        <LiveLabTestsPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
