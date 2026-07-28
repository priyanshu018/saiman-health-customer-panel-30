"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CustomerShellAuthActions } from "@/components/customer-live";
import { primaryNav } from "@/lib/customer-web-data";
import type { LandingFooterContent } from "@/lib/customer-site-cms";

type CustomerSiteShellProps = {
  children: React.ReactNode;
  footer: LandingFooterContent;
};

const headerLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Services @ Home", href: "/#services" },
  { label: "Blogs", href: "/blogs" },
  { label: "Support", href: "/support" },
  { label: "Contact Us", href: "/support#contact" },
];

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Blogs", href: "/blogs" },
  { label: "Support", href: "/support" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
];

export function CustomerSiteShell({ children, footer }: CustomerSiteShellProps) {
  const pathname = usePathname();

  return (
    <div className="customer-shell">
      <aside className="customer-sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-badge">SH</span>
          <div>
            <strong>Saiman Healthcare</strong>
            <small>Customer Care Portal</small>
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
          <p>Need urgent guidance from a doctor?</p>
          <Link href="/instant-call" className="sidebar-cta">
            Start Instant Call
          </Link>
        </div>
      </aside>

      <div className="customer-main customer-main-site">
        <header className="site-header">
          <div className="site-header-bar">
            <nav className="site-header-nav" aria-label="Marketing">
              {headerLinks.map((link) => {
                const active = link.href === "/"
                  ? pathname === "/"
                  : link.href.startsWith("/#")
                    ? pathname === "/"
                    : pathname === link.href;

                return (
                  <Link key={link.href} href={link.href} className={active ? "active" : ""}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="site-header-actions">
              <CustomerShellAuthActions />
              <Link href="/auth/login" className="site-portal-cta">
                Patient Portal
              </Link>
            </div>
          </div>
        </header>

        <main className="customer-content">{children}</main>

        <footer className="site-footer">
          <div className="site-footer-grid">
            <div className="site-footer-brand">
              <div className="site-footer-logo">
                <span className="site-brand-mark">+</span>
                <div>
                  <strong>SAIMAN HEALTHCARE</strong>
                  <p>{footer.summary}</p>
                </div>
              </div>

              <div className="site-footer-socials">
                {footer.socials.map((social) => (
                  <a key={social.href} href={social.href} target="_blank" rel="noreferrer">
                    {social.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3>Quick Links</h3>
              <div className="site-footer-links">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3>Our Location</h3>
              <div className="site-footer-contact">
                <p>{footer.address}</p>
                <a href={`mailto:${footer.email}`}>{footer.email}</a>
                {footer.phones.map((phone) => (
                  <a key={phone} href={`tel:${phone.replace(/\s+/g, "")}`}>
                    {phone}
                  </a>
                ))}
              </div>
            </div>

            <div id="contact">
              <h3>{footer.supportTitle}</h3>
              <p className="site-footer-support-copy">{footer.supportDescription}</p>
              <Link href="/support" className="site-footer-support-cta">
                Contact Support
              </Link>
            </div>
          </div>

          <div className="site-footer-bottom">
            <span>© 2026 Saiman Healthcare. All rights reserved.</span>
            <div className="site-footer-legal">
              <Link href="/privacy-policy">Privacy Policy</Link>
              <Link href="/terms-and-conditions">Terms & Conditions</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
