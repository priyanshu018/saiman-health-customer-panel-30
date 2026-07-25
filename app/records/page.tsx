import { CustomerShell } from "@/components/customer-shell";
import { SectionBlock } from "@/components/section-block";
import { recordsSummary } from "@/lib/customer-web-data";

export default function RecordsPage() {
  return (
    <CustomerShell title="Records" subtitle="Keep prescriptions, test reports, consultation summaries, and hospital paperwork together.">
      <SectionBlock title="Digital Health Locker" subtitle="Web version of the customer record and report history experience.">
        <div className="records-grid">
          {recordsSummary.map((item) => (
            <div key={item.label} className="metric-row">
              <span className="meta-text">{item.label}</span>
              <strong style={{ marginTop: 10, fontSize: "1.9rem", letterSpacing: "-0.04em" }}>{item.value}</strong>
            </div>
          ))}
        </div>
      </SectionBlock>
    </CustomerShell>
  );
}
