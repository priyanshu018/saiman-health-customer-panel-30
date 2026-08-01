This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## CMS-driven landing pages

The customer landing page, blogs, and legal pages now read from Supabase CMS tables used by the super admin panel.

- `cms_pages.slug = "home-landing"` powers the homepage hero, footer, and shared marketing content.
- `cms_pages.slug = "about-us"` powers the About Us page and homepage about section.
- `cms_pages.slug = "privacy-policy"` powers the Privacy Policy page.
- `cms_pages.slug = "terms-and-conditions"` powers the Terms & Conditions page.
- `cms_pages.slug = "support"` powers the support intro content above the live ticket form.
- Published rows from `cms_blogs` power the `/blogs` page and homepage blog cards.

Suggested `home-landing` JSON content:

```json
{
  "hero": {
    "eyebrow": "Saiman Healthcare",
    "title": "Empowering recovery and independence at home.",
    "description": "Short banner copy here.",
    "imageUrl": "https://...",
    "primaryAction": { "label": "Book a Consultation", "href": "/doctors" },
    "secondaryAction": { "label": "Talk to Support", "href": "/support" },
    "stats": [
      { "label": "Trusted care pathways", "value": "24×7" },
      { "label": "Home services", "value": "7+" }
    ]
  },
  "about": {
    "eyebrow": "About Us",
    "title": "Critical care and recovery support.",
    "description": "Short about copy here.",
    "imageUrl": "https://...",
    "highlights": ["Highlight one", "Highlight two", "Highlight three"]
  },
  "footer": {
    "summary": "Short footer summary.",
    "address": "Full address",
    "email": "info@example.com",
    "phones": ["9999999999", "011-00000000"],
    "supportTitle": "Request care guidance",
    "supportDescription": "Short support copy here.",
    "socials": [
      { "label": "Facebook", "href": "https://facebook.com/..." },
      { "label": "Instagram", "href": "https://instagram.com/..." }
    ]
  }
}
```

For public browsing, run the updated SQL in [sql/public-browse-policies.sql](/Users/primedepthlabs/PDL/Project_Under_30K/Saiman-healthcare/saiman-health-customer-panel/sql/public-browse-policies.sql:1) so `anon` can read published CMS content.

## App shell & design tokens

- `components/site-header.tsx` and `components/site-footer.tsx` are the single shared header/footer used by every route (public and authenticated) — there is no per-route sidebar. `DashboardFrame` (inside `components/web-app-experience.tsx`) and `CustomerSiteShell` (`components/customer-site-shell.tsx`) both render `<SiteHeader />` and nothing else shell-related.
- Design tokens (colors, typography scale, spacing, radius, shadows, containers, motion) live in `app/globals.css` under `:root`. Change brand colors there, not in individual components — every screen consumes these variables.
- See `APP_PROCESS_LOG.md`'s "Design System" section for what was and wasn't migrated to the new shell/token system.

## Service booking payments (all six priced service types)

- `app/api/payments/create-order` **requires** a `bookingRef` for every priced service type (`doctor_consultation`, `pharmacy_order`, `lab_booking`, `hospital_booking`, `ctmri_booking`, `rental_order`) — the route rejects the request outright if one is missing. The server re-derives the price server-side via `computeBookingPricing()` in `lib/payment-transactions.ts` (from the `users.fee` column for doctors, `pharmacy_product_approvals` for pharmacy orders, or the admin-approved catalog row for the other four) and always ignores whatever `amount` the browser sent. Only `ambulance_booking` still trusts a client-sent amount, since it has no fixed catalog price yet.
- `app/api/payments/checkout` requires a short-lived bearer token (passed as a one-time query param by `create-order`, since the checkout page is reached via a plain top-level browser redirect that can't carry an `Authorization` header) and verifies the transaction's `patient_id` matches the token's user before rendering any payment/customer details. `redirectUri` must be same-origin on both `create-order` and `checkout` — this is an open-redirect guard, not a UX choice.
- `app/api/payments/verify` and `app/api/payments/link-booking` both check `transaction.patient_id === user.id` before acting — a transaction can only be verified or linked by the customer who created it.
- `app/api/service-bookings/fulfill` is a single, idempotent Route Handler that creates the durable booking row (lab/ctmri/hospital/rental) after payment verification. It's safe to call more than once for the same transaction — if already fulfilled, it returns the existing booking instead of creating a duplicate. For hospital/ctmri/rental it also rejects a fulfillment request whose `approvalId`/`equipmentId` doesn't match what was actually priced at `create-order` time — this closes a real "price a cheap service, fulfill an expensive one" gap. The same check isn't yet possible for `lab_booking`, since its booking payload has no field that maps back to the priced `approvalId` (see `APP_PROCESS_LOG.md`).

## Site URL (metadata, sitemap, robots)

- Set `NEXT_PUBLIC_SITE_URL` in `.env` to your production domain (e.g. `https://app.saimanhealthcare.com`) — `app/sitemap.ts` and `app/robots.ts` both use it to build absolute URLs. It falls back to a placeholder domain if unset, so update it before deploying.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
