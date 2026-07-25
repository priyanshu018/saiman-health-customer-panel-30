import { CustomerShell } from "@/components/customer-shell";
import { LiveProfilePanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function ProfilePage() {
  return (
    <CustomerShell title="Profile" subtitle="Customer account settings, preferences, saved addresses, and healthcare context.">
      <SectionBlock title="Account Snapshot" subtitle="Desktop companion for the live mobile profile, consultation stats, and patient settings.">
        <LiveProfilePanel />
      </SectionBlock>
    </CustomerShell>
  );
}
