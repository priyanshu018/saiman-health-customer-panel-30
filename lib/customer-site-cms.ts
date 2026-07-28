import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type CmsPageSummary = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  content: string;
  updated_at: string;
};

export type CmsBlogSummary = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  status: string;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
};

export type SiteStat = {
  label: string;
  value: string;
};

export type SiteAction = {
  label: string;
  href: string;
};

export type SiteSocialLink = {
  label: string;
  href: string;
};

export type LandingHeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  imageUrl: string;
  primaryAction: SiteAction;
  secondaryAction: SiteAction;
  stats: SiteStat[];
};

export type LandingAboutContent = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  imageUrl: string;
};

export type LandingFooterContent = {
  summary: string;
  address: string;
  email: string;
  phones: string[];
  supportTitle: string;
  supportDescription: string;
  socials: SiteSocialLink[];
};

export type LandingContent = {
  hero: LandingHeroContent;
  about: LandingAboutContent;
  footer: LandingFooterContent;
};

export type ServiceSnapshot = {
  doctors: number;
  pharmacy: number;
  labTests: number;
  hospitals: number;
  imaging: number;
  rental: number;
  staffing: number;
};

export const defaultLandingContent: LandingContent = {
  hero: {
    eyebrow: "Saiman Healthcare",
    title: "Empowering recovery and independence at home.",
    description:
      "Bring consultations, diagnostics, nursing support, and recovery services together in one patient-friendly digital journey.",
    imageUrl:
      "https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?auto=format&fit=crop&w=1400&q=80",
    primaryAction: { label: "Book a Consultation", href: "/doctors" },
    secondaryAction: { label: "Talk to Support", href: "/support" },
    stats: [
      { label: "Trusted care pathways", value: "24×7" },
      { label: "Home services", value: "7+" },
      { label: "Patient-first workflow", value: "1 app" },
    ],
  },
  about: {
    eyebrow: "About Us",
    title: "Critical care, home recovery, and everyday health support in one connected platform.",
    description:
      "Saiman Healthcare helps patients move from hospital to home with guided support, specialist access, diagnostics, and follow-up services that can be managed by the care team and super admin.",
    highlights: [
      "Doctor consultations, diagnostics, and medicine support",
      "Home-care staffing and equipment for ongoing recovery",
      "CMS-managed pages, blogs, and legal information",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
  },
  footer: {
    summary:
      "A connected customer portal for care discovery, recovery planning, and direct support.",
    address: "11702/3, Main GT Road, Shakti Nagar, Delhi - 110007",
    email: "info@saimanhealthcare.com",
    phones: ["9999500123", "011-61384456", "011-49989190"],
    supportTitle: "Request care guidance",
    supportDescription:
      "Use the support page to raise tickets, ask for service guidance, and connect with the care coordination team.",
    socials: [
      { label: "Facebook", href: "https://www.facebook.com/" },
      { label: "Instagram", href: "https://www.instagram.com/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/" },
    ],
  },
};

function client() {
  return getSupabaseBrowserClient();
}

function text(value: unknown, fallback = "") {
  return String(value || "").trim() || fallback;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function toAction(value: unknown, fallback: SiteAction): SiteAction {
  if (!value || typeof value !== "object") return fallback;
  return {
    label: text((value as { label?: unknown }).label, fallback.label),
    href: text((value as { href?: unknown }).href, fallback.href),
  };
}

function toSocialLinks(value: unknown, fallback: SiteSocialLink[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        label: text((item as { label?: unknown }).label),
        href: text((item as { href?: unknown }).href),
      };
    })
    .filter((item): item is SiteSocialLink => Boolean(item?.label && item?.href));
  return items.length ? items : fallback;
}

function toStats(value: unknown, fallback: SiteStat[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return {
        label: text((item as { label?: unknown }).label),
        value: text((item as { value?: unknown }).value),
      };
    })
    .filter((item): item is SiteStat => Boolean(item?.label && item?.value));
  return items.length ? items : fallback;
}

export function parseLandingContent(content: string | null | undefined): LandingContent {
  const fallback = defaultLandingContent;
  if (!content) return fallback;

  try {
    const parsed = JSON.parse(content) as {
      hero?: Record<string, unknown>;
      about?: Record<string, unknown>;
      footer?: Record<string, unknown>;
    };

    const hero = parsed.hero || {};
    const about = parsed.about || {};
    const footer = parsed.footer || {};

    return {
      hero: {
        eyebrow: text(hero.eyebrow, fallback.hero.eyebrow),
        title: text(hero.title, fallback.hero.title),
        description: text(hero.description, fallback.hero.description),
        imageUrl: text(hero.imageUrl, fallback.hero.imageUrl),
        primaryAction: toAction(hero.primaryAction, fallback.hero.primaryAction),
        secondaryAction: toAction(hero.secondaryAction, fallback.hero.secondaryAction),
        stats: toStats(hero.stats, fallback.hero.stats),
      },
      about: {
        eyebrow: text(about.eyebrow, fallback.about.eyebrow),
        title: text(about.title, fallback.about.title),
        description: text(about.description, fallback.about.description),
        highlights: toStringArray(about.highlights).length
          ? toStringArray(about.highlights)
          : fallback.about.highlights,
        imageUrl: text(about.imageUrl, fallback.about.imageUrl),
      },
      footer: {
        summary: text(footer.summary, fallback.footer.summary),
        address: text(footer.address, fallback.footer.address),
        email: text(footer.email, fallback.footer.email),
        phones: toStringArray(footer.phones).length ? toStringArray(footer.phones) : fallback.footer.phones,
        supportTitle: text(footer.supportTitle, fallback.footer.supportTitle),
        supportDescription: text(footer.supportDescription, fallback.footer.supportDescription),
        socials: toSocialLinks(footer.socials, fallback.footer.socials),
      },
    };
  } catch {
    return {
      ...fallback,
      about: {
        ...fallback.about,
        description: content.trim() || fallback.about.description,
      },
    };
  }
}

export function contentToParagraphs(content: string | null | undefined) {
  return String(content || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export async function fetchPublishedCmsPageBySlug(slug: string) {
  const { data, error } = await client()
    .from("cms_pages")
    .select("id,title,slug,type,status,content,updated_at")
    .eq("slug", slug)
    .eq("status", "Published")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CmsPageSummary | null) ?? null;
}

export async function fetchPublishedCmsBlogs(limit?: number) {
  let query = client()
    .from("cms_blogs")
    .select("id,title,excerpt,content,category,author,status,image_url,published_at,created_at")
    .eq("status", "Published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as CmsBlogSummary[];
}
