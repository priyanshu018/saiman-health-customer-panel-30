import type { Metadata } from "next";
import { CustomerCmsContentPage } from "@/components/customer-site-pages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Saiman Healthcare collects, uses, and protects your personal and health information.",
};

export default function PrivacyPolicyPage() {
  return (
    <CustomerCmsContentPage
      slug="privacy-policy"
      fallbackTitle="Privacy Policy"
      fallbackBody={[
        "Saiman Healthcare uses this portal to provide service discovery, support coordination, and customer account access. Personal data should only be used for care delivery, communication, and platform operations.",
        "Publish a CMS page with the slug privacy-policy from the super admin panel to replace this fallback text with your legal copy.",
      ]}
    />
  );
}
