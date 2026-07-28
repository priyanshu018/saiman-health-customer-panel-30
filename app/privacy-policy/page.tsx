import { CustomerCmsContentPage } from "@/components/customer-site-pages";

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
