import { CustomerShell } from "@/components/customer-shell";
import { LiveHospitalsPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function HospitalsPage() {
  return (
    <CustomerShell title="Hospitals & Surgeries" subtitle="Browse hospitals, compare specialties, and move toward consultation or surgery discovery flows.">
      <SectionBlock title="Featured Hospitals" subtitle="Desktop entry point for the same hospital discovery flow used in the app.">
        <LiveHospitalsPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
