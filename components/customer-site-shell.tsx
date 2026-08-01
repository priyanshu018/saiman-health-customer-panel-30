import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { LandingFooterContent } from "@/lib/customer-site-cms";

type CustomerSiteShellProps = {
  children: React.ReactNode;
  footer: LandingFooterContent;
};

export function CustomerSiteShell({ children, footer }: CustomerSiteShellProps) {
  return (
    <div className="app-shell">
      <SiteHeader mode="public" />
      <main className="app-content app-content-public">{children}</main>
      <SiteFooter footer={footer} />
    </div>
  );
}
