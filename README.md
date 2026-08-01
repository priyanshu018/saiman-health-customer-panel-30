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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
