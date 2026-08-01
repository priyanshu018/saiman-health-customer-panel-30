import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://app.saimanhealthcare.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated account/booking/checkout screens have no unique
        // indexable content and shouldn't show up in search results.
        disallow: [
          "/appointments",
          "/records",
          "/profile",
          "/pharmacy/cart",
          "/pharmacy/orders",
          "/lab-tests/bookings",
          "/ct-mri/bookings",
          "/hospitals/requests",
          "/rental-equipment/orders",
          "/care-staff/bookings",
          "/care-staff/request",
          "/payment-callback",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
