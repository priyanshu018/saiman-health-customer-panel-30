import { CustomerShell } from "@/components/customer-shell";
import { LiveSupportPanel } from "@/components/customer-live";
import { SectionBlock } from "@/components/section-block";
import { supportTopics } from "@/lib/customer-web-data";

export default function SupportPage() {
  return (
    <CustomerShell title="Support" subtitle="Customer support surface for bookings, payments, reports, and emergency help.">
      <SectionBlock title="Support topics">
        <div className="card-grid three">
          {supportTopics.map((topic) => (
            <div key={topic} className="list-card">
              <strong>{topic}</strong>
            </div>
          ))}
        </div>
      </SectionBlock>
      <SectionBlock title="Live support tickets" subtitle="Raise a customer ticket and see the same support status that the mobile app uses.">
        <LiveSupportPanel />
      </SectionBlock>
    </CustomerShell>
  );
}
