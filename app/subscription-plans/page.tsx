import { CustomerShell } from "@/components/customer-shell";
import { SectionBlock } from "@/components/section-block";
import { subscriptionPlans } from "@/lib/customer-web-data";

export default function SubscriptionPlansPage() {
  return (
    <CustomerShell title="Subscription Plans" subtitle="Explore health-card style bundled plans and member benefits on web.">
      <SectionBlock title="Membership Plans">
        <div className="plans-grid">
          {subscriptionPlans.map((plan) => (
            <div key={plan.name} className="plan-card">
              <strong>{plan.name}</strong>
              <div className="plan-price">{plan.price}</div>
              <p className="meta-text">{plan.detail}</p>
              <div style={{ marginTop: 18 }}>
                <span className="inline-button">Choose Plan</span>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </CustomerShell>
  );
}
