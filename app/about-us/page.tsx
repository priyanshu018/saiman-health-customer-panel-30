import { CustomerCmsContentPage } from "@/components/customer-site-pages";

export default function AboutUsPage() {
  return (
    <CustomerCmsContentPage
      slug="about-us"
      fallbackTitle="About Us"
      fallbackBody={[
        "Saiman Healthcare brings doctor consultations, diagnostics, recovery support, and patient coordination into one connected digital experience.",
        "This page is CMS-driven and can be updated by super admin from the existing CMS pages manager.",
      ]}
    />
  );
}
