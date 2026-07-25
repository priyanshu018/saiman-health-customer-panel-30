import { CustomerShell } from "@/components/customer-shell";
import { SectionBlock } from "@/components/section-block";

export default function AmbulancePage() {
  return (
    <CustomerShell title="Ambulance" subtitle="Request emergency transport, confirm location, and monitor dispatch from the web experience.">
      <SectionBlock title="Emergency Flow" subtitle="Built to match the customer app’s booking, payment, and tracking funnel.">
        <div className="card-grid two">
          <div className="plan-card">
            <strong>Need emergency support now?</strong>
            <p className="meta-text" style={{ marginTop: 10 }}>
              Share pickup details, patient information, and destination hospital. Dispatch visibility and payment review can live here.
            </p>
            <div style={{ marginTop: 18 }}>
              <span className="inline-button">Start Ambulance Request</span>
            </div>
          </div>
          <div className="plan-card">
            <strong>Tracked milestones</strong>
            <div className="list-stack" style={{ marginTop: 16 }}>
              <div className="list-card"><strong>Request Created</strong><p className="meta-text" style={{ marginTop: 8 }}>Patient request submitted from web panel.</p></div>
              <div className="list-card"><strong>Driver Assigned</strong><p className="meta-text" style={{ marginTop: 8 }}>Live assignment and ETA visibility.</p></div>
              <div className="list-card"><strong>Trip Complete</strong><p className="meta-text" style={{ marginTop: 8 }}>History and bill summary available in one place.</p></div>
            </div>
          </div>
        </div>
      </SectionBlock>
    </CustomerShell>
  );
}
