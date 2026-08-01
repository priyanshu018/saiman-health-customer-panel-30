import type { Metadata } from "next";
import { CustomerCmsContentPage } from "@/components/customer-site-pages";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern your use of the Saiman Healthcare platform.",
};

export default function TermsAndConditionsPage() {
  return (
    <CustomerCmsContentPage
      slug="terms-and-conditions"
      fallbackTitle="Terms & Conditions"
      fallbackBody={[
        "These terms govern the use of the Saiman Healthcare customer portal, including browsing services, support workflows, and account-based healthcare transactions.",
        "Publish a CMS page with the slug terms-and-conditions from the super admin panel to replace this fallback text with your official legal content.",
      ]}
    />
  );
}
