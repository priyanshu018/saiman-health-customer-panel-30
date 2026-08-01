import type { Metadata } from "next";
import { CustomerCmsContentPage } from "@/components/customer-site-pages";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Saiman Healthcare's mission to connect patients with verified care providers.",
};

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
