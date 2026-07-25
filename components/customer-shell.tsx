"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CustomerShellAuthActions } from "@/components/customer-live";
import { primaryNav } from "@/lib/customer-web-data";

type CustomerShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function CustomerShell({ title, subtitle, children, actions }: CustomerShellProps) {
  const pathname = usePathname();

  return (
    <div className="customer-shell">
      <aside className="customer-sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-badge">AH</span>
          <div>
            <strong>Saiman Health</strong>
            <small>Customer Web Panel</small>
          </div>
        </Link>

        <nav className="customer-nav">
          {primaryNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`customer-nav-link${active ? " active" : ""}`}>
                <span>{item.short}</span>
                <small>{item.label}</small>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <p>Ready for a care action?</p>
          <Link href="/instant-call" className="sidebar-cta">
            Start Instant Call
          </Link>
        </div>
      </aside>

      <div className="customer-main">
        <header className="customer-header">
          <div>
            <p className="eyebrow">Austy Healthcare Platform</p>
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
          </div>
          <div className="header-actions">
            <CustomerShellAuthActions />
            {actions}
          </div>
        </header>

        <main className="customer-content">{children}</main>
      </div>
    </div>
  );
}
