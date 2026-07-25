import Link from "next/link";
import { CustomerShell } from "@/components/customer-shell";
import { SectionBlock } from "@/components/section-block";
import {
  appointmentTimeline,
  featuredDoctors,
  featuredHospitals,
  featuredPharmacy,
  featuredTests,
  healthPrograms,
  heroStats,
  recordsSummary,
  serviceCards,
} from "@/lib/customer-web-data";

export default function HomePage() {
  return (
    <CustomerShell
      title="One customer platform for every healthcare need."
      subtitle="This web panel mirrors the Saiman customer application with one place for consultations, medicines, labs, hospitals, ambulance support, appointments, and records."
    >
      <div className="hero-grid">
        <div className="hero-card">
          <p className="eyebrow">Customer Command Center</p>
          <h2>Book care, track every order, and keep your health journey organized.</h2>
          <p>
            Move across doctors, pharmacy, diagnostics, hospitals, staffing, and emergency support from one account.
            This web panel is designed as the desktop counterpart of the customer app.
          </p>
          <div className="hero-actions">
            <Link href="/appointments" className="primary-button">Open Appointments</Link>
            <Link href="/records" className="ghost-button">View Records</Link>
            <Link href="/support" className="pill-link">Get Support</Link>
          </div>
        </div>

        <div className="surface-card">
          <h3>Upcoming Activity</h3>
          <p>Everything important that needs your attention next.</p>
          <div className="list-stack" style={{ marginTop: 18 }}>
            {appointmentTimeline.map((item) => (
              <div key={`${item.title}-${item.when}`} className="list-card">
                <strong>{item.title}</strong>
                <p className="meta-text" style={{ marginTop: 6 }}>{item.provider}</p>
                <div className="meta-row">
                  <span>{item.when}</span>
                  <span className="status-chip">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {heroStats.map((item) => (
          <div key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        ))}
      </div>

      <SectionBlock title="Explore Services" subtitle="All the major customer app service lines are available from the web panel navigation.">
        <div className="card-grid three">
          {serviceCards.map((item) => (
            <Link key={item.title} href={item.href} className={`plan-card accent-${item.accent}`}>
              <strong>{item.title}</strong>
              <p className="meta-text" style={{ marginTop: 10 }}>{item.subtitle}</p>
              <div style={{ marginTop: 18 }}>
                <span className="inline-button">{item.action}</span>
              </div>
            </Link>
          ))}
        </div>
      </SectionBlock>

      <div className="card-grid two">
        <SectionBlock title="Featured Doctors">
          <div className="list-stack">
            {featuredDoctors.map((item) => (
              <div key={item.name} className="list-card">
                <strong>{item.name}</strong>
                <p className="meta-text" style={{ marginTop: 6 }}>{item.specialty}</p>
                <div className="meta-row">
                  <span>{item.availability}</span>
                  <span>{item.fee} · ⭐ {item.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock title="Pharmacy Highlights">
          <div className="list-stack">
            {featuredPharmacy.map((item) => (
              <div key={item.name} className="list-card">
                <strong>{item.name}</strong>
                <p className="meta-text" style={{ marginTop: 6 }}>{item.offer}</p>
                <div className="meta-row">
                  <span>{item.eta}</span>
                  <span>{item.price}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>

      <div className="card-grid two">
        <SectionBlock title="Lab Tests Snapshot">
          <div className="list-stack">
            {featuredTests.map((item) => (
              <div key={item.name} className="list-card">
                <strong>{item.name}</strong>
                <p className="meta-text" style={{ marginTop: 6 }}>{item.lab}</p>
                <div className="meta-row">
                  <span>{item.report}</span>
                  <span>{item.price}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>

        <SectionBlock title="Hospital Discovery">
          <div className="list-stack">
            {featuredHospitals.map((item) => (
              <div key={item.name} className="list-card">
                <strong>{item.name}</strong>
                <p className="meta-text" style={{ marginTop: 6 }}>{item.focus}</p>
                <div className="meta-row">
                  <span>{item.city}</span>
                  <span>{item.price}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      </div>

      <SectionBlock title="Health Programs">
        <div className="card-grid three">
          {healthPrograms.map((item) => (
            <Link key={item.title} href={item.href} className="list-card">
              <strong>{item.title}</strong>
              <p className="meta-text" style={{ marginTop: 10 }}>{item.detail}</p>
            </Link>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Records Overview">
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
