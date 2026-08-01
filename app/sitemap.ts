import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://app.saimanhealthcare.com";

// Only stable, publicly-indexable marketing/discovery routes. Authenticated
// account/booking/checkout screens are excluded here and blocked in
// app/robots.ts. Per-entity detail pages (doctors/[id], hospitals/[id],
// etc.) are not included yet — see APP_PROCESS_LOG.md for follow-up.
const STATIC_ROUTES = [
  "",
  "/doctors",
  "/pharmacy",
  "/lab-tests",
  "/ct-mri",
  "/hospitals",
  "/rental-equipment",
  "/care-staff",
  "/ambulance",
  "/health-card",
  "/subscription-plans",
  "/blogs",
  "/about-us",
  "/privacy-policy",
  "/terms-and-conditions",
  "/support",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
