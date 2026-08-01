import Link from "next/link";
import type { LandingFooterContent } from "@/lib/customer-site-cms";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "Blogs", href: "/blogs" },
  { label: "Support", href: "/support" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
];

export function SiteFooter({ footer }: { footer: LandingFooterContent }) {
  return (
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
          <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
