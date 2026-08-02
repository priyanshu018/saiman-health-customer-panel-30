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

export type CmsBannerSummary = {
  id: string;
  title: string;
  description: string | null;
  platforms: string[] | null;
  position: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
};

export type ServiceCardSetting = {
  id: string;
  visible: boolean;
  functional: boolean;
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

export const SERVICE_CARDS_SETTING_KEY = "service_cards";

export const DEFAULT_SERVICE_CARD_SETTINGS: ServiceCardSetting[] = [
  { id: "doctor-consult", visible: true, functional: true },
  { id: "staffing", visible: true, functional: true },
  { id: "pharmacy", visible: true, functional: true },
  { id: "lab-tests", visible: true, functional: true },
  { id: "ct-mri", visible: true, functional: true },
  { id: "ambulance", visible: true, functional: true },
  { id: "rental", visible: true, functional: true },
  { id: "hospitals", visible: true, functional: true },
  { id: "health-card", visible: true, functional: true },
];

const WEB_BANNER_PLATFORMS = [
  "Patient App",
  "Patient Web",
  "Customer Web",
  "Customer Panel",
  "Web App",
];

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

function isLiveWindow(item: Pick<CmsBannerSummary, "start_date" | "end_date">) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = item.start_date ? new Date(item.start_date) : null;
  const end = item.end_date ? new Date(item.end_date) : null;

  if (start && start > today) return false;
  if (end && end < today) return false;
  return true;
}

function normalizeServiceCardSetting(row: Partial<ServiceCardSetting> | undefined, fallback: ServiceCardSetting) {
  return {
    id: fallback.id,
    visible: typeof row?.visible === "boolean" ? row.visible : fallback.visible,
    functional: typeof row?.functional === "boolean" ? row.functional : fallback.functional,
  };
}

export function normalizeServiceCardSettings(value: unknown) {
  const rows = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && Array.isArray((value as { services?: unknown }).services)
      ? (value as { services: unknown[] }).services
      : [];

  const byId = new Map(
    rows.map((row) => {
      const item = row as Partial<ServiceCardSetting>;
      return [String(item.id || ""), item];
    }),
  );

  return DEFAULT_SERVICE_CARD_SETTINGS.map((fallback) => normalizeServiceCardSetting(byId.get(fallback.id), fallback));
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

export function subscribePublishedCmsPageBySlug(
  slug: string,
  listener: (page: CmsPageSummary | null) => void,
) {
  let active = true;

  const load = () => {
    fetchPublishedCmsPageBySlug(slug)
      .then((page) => {
        if (active) listener(page);
      })
      .catch(() => {
        if (active) listener(null);
      });
  };

  load();

  const channel = client()
    .channel(`customer-cms-page-${slug}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "cms_pages", filter: `slug=eq.${slug}` }, load)
    .subscribe();

  return () => {
    active = false;
    void client().removeChannel(channel);
  };
}

export function subscribePublishedCmsBlogs(
  listener: (blogs: CmsBlogSummary[]) => void,
  limit?: number,
) {
  let active = true;

  const load = () => {
    fetchPublishedCmsBlogs(limit)
      .then((blogs) => {
        if (active) listener(blogs);
      })
      .catch(() => {
        if (active) listener([]);
      });
  };

  load();

  const channel = client()
    .channel(`customer-cms-blogs-${limit ?? "all"}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "cms_blogs" }, load)
    .subscribe();

  return () => {
    active = false;
    void client().removeChannel(channel);
  };
}

export async function fetchHomeBanners(position = "Home Banner") {
  const { data, error } = await client()
    .from("banners")
    .select("id,title,description,platforms,position,status,start_date,end_date,image_url,created_at")
    .eq("status", "Active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as CmsBannerSummary[])
    .filter((banner) => !position || banner.position === position)
    .filter((banner) => !banner.platforms?.length || banner.platforms.some((platform) => WEB_BANNER_PLATFORMS.includes(platform)))
    .filter(isLiveWindow);
}

export async function trackBannerClick(id: string) {
  const { error } = await client().rpc("increment_banner_clicks", { banner_id: id });
  if (error) throw new Error(error.message);
}

export async function fetchServiceCardSettings() {
  const { data, error } = await client()
    .from("app_settings")
    .select("value")
    .eq("key", SERVICE_CARDS_SETTING_KEY)
    .maybeSingle();

  if (error) return DEFAULT_SERVICE_CARD_SETTINGS;
  return normalizeServiceCardSettings(data?.value);
}

export function subscribeHomeBanners(listener: (banners: CmsBannerSummary[]) => void, position = "Home Banner") {
  let active = true;

  const load = () => {
    fetchHomeBanners(position)
      .then((banners) => {
        if (active) listener(banners);
      })
      .catch(() => {
        if (active) listener([]);
      });
  };

  load();

  const channel = client()
    .channel(`customer-home-banners-${position}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, load)
    .subscribe();

  return () => {
    active = false;
    void client().removeChannel(channel);
  };
}

export function subscribeServiceCardSettings(listener: (settings: ServiceCardSetting[]) => void) {
  const channel = client()
    .channel(`customer-service-cards-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${SERVICE_CARDS_SETTING_KEY}` },
      (payload) => {
        const row = (payload.new || payload.old) as { value?: unknown } | null;
        listener(normalizeServiceCardSettings(row?.value));
      },
    )
    .subscribe();

  return () => {
    void client().removeChannel(channel);
  };
}
