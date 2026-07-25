import { CustomerShell } from "@/components/customer-shell";
import { LivePharmacyPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function PharmacyPage() {
  return (
    <CustomerShell title="Pharmacy" subtitle="Compare approved pharmacies, discover offers, and manage medicine orders from desktop.">
      <SectionBlock title="Partner Pharmacies" subtitle="Same customer-facing pharmacy discovery flow, adapted for web.">
        <LivePharmacyPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
