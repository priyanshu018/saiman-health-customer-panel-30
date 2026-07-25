import { CustomerShell } from "@/components/customer-shell";
import { LiveDoctorsPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function DoctorsPage() {
  return (
    <CustomerShell title="Doctors" subtitle="Browse verified doctors across clinic, video, voice, and instant consultation modes.">
      <SectionBlock title="Available Doctors" subtitle="Web counterpart of the mobile doctor discovery and consultation flow.">
        <LiveDoctorsPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
