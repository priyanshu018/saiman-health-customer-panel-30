import { CustomerShell } from "@/components/customer-shell";
import { LiveAppointmentsPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";

export default function AppointmentsPage() {
  return (
    <CustomerShell title="Appointments" subtitle="Manage booked consultations, tests, and service confirmations from the web dashboard.">
      <SectionBlock title="Appointments & Consultations" subtitle="This page now reads the live customer appointment records from the shared Supabase project.">
        <LiveAppointmentsPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
