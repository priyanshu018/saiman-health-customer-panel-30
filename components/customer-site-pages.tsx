"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CustomerSiteShell } from "@/components/customer-site-shell";
import { useCustomerUser } from "@/components/customer-live";
import {
  createSupportTicket,
  fetchSupportTickets,
  type SupportTicketSummary,
} from "@/lib/customer-web-live";
import {
  contentToParagraphs,
  defaultLandingContent,
  fetchHomeBanners,
  fetchPublishedCmsBlogs,
  fetchPublishedCmsPageBySlug,
  fetchServiceCardSettings,
  parseLandingContent,
  subscribeHomeBanners,
  subscribePublishedCmsBlogs,
  subscribePublishedCmsPageBySlug,
  subscribeServiceCardSettings,
  trackBannerClick,
  type CmsBannerSummary,
  type CmsBlogSummary,
  type CmsPageSummary,
  type LandingContent,
  type ServiceCardSetting,
} from "@/lib/customer-site-cms";
import { getSupabaseEnv } from "@/lib/supabase-browser";

function formatDate(value: string | null) {
  if (!value) return "Recently published";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeParagraphs(content: string | null | undefined, fallback: string[]) {
  const blocks = contentToParagraphs(content);
  return blocks.length ? blocks : fallback;
}

const LANDING_HOME_SERVICES = [
  { id: "doctor-consult", title: "Doctor Consult", href: "/doctors", imageSrc: "/home-service-doctor.png" },
  { id: "pharmacy", title: "Pharmacy", href: "/pharmacy", imageSrc: "/home-service-pharmacy.png" },
  { id: "lab-tests", title: "Lab Tests", href: "/lab-tests", imageSrc: "/home-service-lab.png" },
  { id: "ct-mri", title: "CT / MRI", href: "/ct-mri", imageSrc: "/home-service-ctmri.png" },
  { id: "ambulance", title: "Ambulance", href: "/ambulance", imageSrc: "/home-service-ambulance.png" },
  { id: "rental", title: "Rental Equipment", href: "/rental-equipment", imageSrc: "/home-service-rental.png" },
  { id: "hospitals", title: "Hospitals & Surgeries", href: "/hospitals", imageSrc: "/home-service-hospital.png" },
  { id: "health-card", title: "Health Card", href: "/health-card", imageSrc: "/home-service-health-card.png" },
  { id: "staffing", title: "Care Staff", href: "/care-staff", imageSrc: "/home-service-staffing.png" },
] as const;

function SitePageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="site-page-intro">
      <p className="site-section-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  );
}

const LEGAL_PAGE_EYEBROWS: Record<string, string> = {
  "about-us": "About Us",
  "privacy-policy": "Privacy",
  "terms-and-conditions": "Terms",
};

function LegalContent({
  page,
  slug,
  fallbackTitle,
  fallbackBody,
}: {
  page: CmsPageSummary | null;
  slug: string;
  fallbackTitle: string;
  fallbackBody: string[];
}) {
  const title = page?.title || fallbackTitle;
  const paragraphs = safeParagraphs(page?.content, fallbackBody);

  return (
    <article className="cms-page-card">
      <SitePageIntro eyebrow={LEGAL_PAGE_EYEBROWS[slug] || "Saiman Healthcare"} title={title} description="" />

      <div className="cms-rich-text">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

export function CustomerLandingPage() {
  const router = useRouter();
  const [landing, setLanding] = useState<LandingContent>(defaultLandingContent);
  const [blogs, setBlogs] = useState<CmsBlogSummary[]>([]);
  const [homeBanners, setHomeBanners] = useState<CmsBannerSummary[]>([]);
  const [activeHomeBannerIndex, setActiveHomeBannerIndex] = useState(0);
  const [serviceSettings, setServiceSettings] = useState<ServiceCardSetting[]>([]);
  const [homeSearchQuery, setHomeSearchQuery] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchPublishedCmsPageBySlug("home-landing"),
      fetchPublishedCmsBlogs(3),
      fetchHomeBanners("Home Banner"),
      fetchServiceCardSettings(),
    ]).then((results) => {
      if (!active) return;

      const [landingResult, blogResult, bannerResult, settingsResult] = results;

      if (landingResult.status === "fulfilled" && landingResult.value?.content) {
        setLanding(parseLandingContent(landingResult.value.content));
      }

      if (blogResult.status === "fulfilled") {
        setBlogs(blogResult.value);
      }

      if (bannerResult.status === "fulfilled") {
        setHomeBanners(bannerResult.value);
      }

      if (settingsResult.status === "fulfilled") {
        setServiceSettings(settingsResult.value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeHomeBanners(setHomeBanners, "Home Banner"), []);
  useEffect(
    () =>
      subscribePublishedCmsPageBySlug("home-landing", (page) => {
        if (page?.content) {
          setLanding(parseLandingContent(page.content));
        }
      }),
    [],
  );
  useEffect(() => subscribePublishedCmsBlogs(setBlogs, 3), []);
  useEffect(() => subscribeServiceCardSettings(setServiceSettings), []);

  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveHomeBannerIndex((current) => (current + 1) % homeBanners.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [homeBanners.length]);

  const serviceSettingsById = useMemo(
    () => new Map(serviceSettings.map((setting) => [setting.id, setting])),
    [serviceSettings],
  );
  const landingHomeServices = useMemo(
    () =>
      LANDING_HOME_SERVICES.map((service) => {
        const setting = serviceSettingsById.get(service.id);
        return {
          ...service,
          visible: setting?.visible ?? true,
          restricted: setting?.functional === false,
        };
      }).filter((service) => service.visible),
    [serviceSettingsById],
  );
  const activeBanner = homeBanners.length ? homeBanners[activeHomeBannerIndex % homeBanners.length] : null;
  const featuredBlog = blogs[0] || null;
  const remainingBlogs = blogs.slice(1, 3);
  const quickFeatures = [
    { label: "Doctor Consult", href: "/doctors" },
    { label: "Lab Tests", href: "/lab-tests" },
    { label: "Medicine Order", href: "/pharmacy" },
    { label: "Instant Call", href: "/instant-call" },
  ];
  const hospitalOptions = [
    { title: "Nearby Hospitals", detail: "Find hospitals near you", href: "/hospitals" },
    { title: "Top Rated Hospitals", detail: "Best hospitals and clinics", href: "/hospitals" },
    { title: "Speciality Hospitals", detail: "Find by speciality", href: "/hospitals" },
  ];

  function handleHomeSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = homeSearchQuery.trim().toLowerCase();
    if (!query) {
      router.push("/doctors");
      return;
    }

    const matchedService = landingHomeServices.find((service) => service.title.toLowerCase().includes(query));
    if (matchedService && !matchedService.restricted) {
      router.push(matchedService.href);
      return;
    }

    if (query.includes("doctor") || query.includes("consult")) {
      router.push("/doctors");
      return;
    }
    if (query.includes("lab") || query.includes("test") || query.includes("ct") || query.includes("mri")) {
      router.push("/lab-tests");
      return;
    }
    if (query.includes("medicine") || query.includes("pharmacy") || query.includes("prescription")) {
      router.push("/pharmacy");
      return;
    }
    if (query.includes("hospital") || query.includes("surgery")) {
      router.push("/hospitals");
      return;
    }
    if (query.includes("ambulance") || query.includes("emergency")) {
      router.push("/ambulance");
      return;
    }

    router.push("/support");
  }

  return (
    <CustomerSiteShell footer={landing.footer}>
      <section className="mobile-home-top-shell">
        <div className="mobile-home-search-panel">
          <div className="mobile-home-search-copy">
            <p className="site-section-eyebrow">Good Morning</p>
            <h1>{landing.hero.title}</h1>
            <p>{landing.hero.description}</p>
          </div>

          <form className="mobile-home-search-card" onSubmit={handleHomeSearch}>
            <label className="mobile-home-search-label" htmlFor="home-service-search">
              Search doctors, tests, medicines...
            </label>
            <div className="mobile-home-search-row">
              <input
                id="home-service-search"
                className="mobile-home-search-input"
                value={homeSearchQuery}
                onChange={(event) => setHomeSearchQuery(event.target.value)}
                placeholder="Search doctors, tests, medicines..."
                aria-label="Search doctors, tests, or medicines"
              />
              <button type="submit" className="mobile-home-search-button">
                Search
              </button>
            </div>
          </form>

          <div className="mobile-home-feature-row">
            {quickFeatures.map((feature) => (
              <Link key={feature.label} href={feature.href} className="mobile-home-feature-chip">
                {feature.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mobile-home-hero">
        <article
          className="mobile-home-banner"
          onClick={() => {
            if (activeBanner?.id) {
              void trackBannerClick(activeBanner.id).catch(() => undefined);
            }
          }}
        >
          {activeBanner?.image_url ? (
            <Image
              src={activeBanner.image_url}
              alt={activeBanner.title || "Home banner"}
              fill
              sizes="(max-width: 980px) 100vw, 760px"
              style={{ objectFit: "cover" }}
            />
          ) : null}
          <div className="mobile-home-banner-overlay" />
          <div className="mobile-home-banner-copy">
            <span className="mobile-home-banner-pill">Limited Time</span>
            <h1>{activeBanner?.title || "No active banner"}</h1>
            <p>{activeBanner?.description || "Add an active home banner in admin to show it here."}</p>
            <div className="mobile-home-banner-action">
              <Link href="/lab-tests" className="mobile-home-banner-button">
                Book Now
              </Link>
            </div>
          </div>
          {homeBanners.length > 1 ? (
            <div className="mobile-home-banner-dots">
              {homeBanners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  className={index === activeHomeBannerIndex % homeBanners.length ? "mobile-home-banner-dot active" : "mobile-home-banner-dot"}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveHomeBannerIndex(index);
                  }}
                  aria-label={`Show banner ${index + 1}`}
                />
              ))}
            </div>
          ) : null}
        </article>

        <Link href="/blogs" className="mobile-home-side-card mobile-home-side-card-link">
          {featuredBlog?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featuredBlog.image_url} alt={featuredBlog.title} className="mobile-home-side-image" />
          ) : (
            <div className="mobile-home-side-image mobile-home-side-image-fallback" />
          )}
          <span className="mobile-home-side-tag">{featuredBlog?.category || "Health Blog"}</span>
          <h2>{featuredBlog?.title || "How to prepare for a Lab Test"}</h2>
          <p>{featuredBlog?.excerpt || "Simple steps to get more accurate lab results before your next test."}</p>
        </Link>
      </section>

      <section className="mobile-home-services-section">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Our Services</p>
          </div>
          <Link href="/doctors" className="pill-link">
            View all
          </Link>
        </div>

        <div className="mobile-home-services-grid">
          {landingHomeServices.map((service) =>
            service.restricted ? (
              <div key={service.id} className="mobile-home-service-card restricted">
                <div className="mobile-home-service-icon-wrap">
                  <Image src={service.imageSrc} alt={service.title} width={92} height={92} className="mobile-home-service-icon" />
                </div>
                <strong>{service.title}</strong>
                <span className="mobile-home-service-badge">Restricted</span>
              </div>
            ) : (
              <Link key={service.id} href={service.href} className="mobile-home-service-card">
                <div className="mobile-home-service-icon-wrap">
                  <Image src={service.imageSrc} alt={service.title} width={92} height={92} className="mobile-home-service-icon" />
                </div>
                <strong>{service.title}</strong>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="site-section-card">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Health Blogs</p>
            <h2>Health tips and updates from our care team.</h2>
          </div>
          <Link href="/blogs" className="pill-link">
            View all blogs
          </Link>
        </div>

        <div className="landing-blog-grid">
          {(remainingBlogs.length ? remainingBlogs : blogs).map((blog) => (
            <article key={blog.id} className="landing-blog-card">
              {blog.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blog.image_url} alt={blog.title} className="landing-blog-image" />
              ) : null}
              <div className="landing-blog-body">
                <span>{blog.category || "Healthcare"}</span>
                <h3>{blog.title}</h3>
                <p>{blog.excerpt || contentToParagraphs(blog.content)[0] || "Read the latest patient care update."}</p>
                <small>{formatDate(blog.published_at || blog.created_at)}</small>
              </div>
            </article>
          ))}

          {!blogs.length ? (
            <article className="landing-blog-card landing-blog-card-empty">
              <div className="landing-blog-body">
                <span>Coming Soon</span>
                <h3>New health articles are on the way.</h3>
                <p>Check back soon for guidance on consultations, diagnostics, medicines, and home recovery.</p>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="site-section-card">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Find Hospitals</p>
            <h2>Browse hospitals or connect with a doctor instantly.</h2>
          </div>
        </div>

        <div className="home-dual-grid">
          <div className="home-hospital-card">
            {hospitalOptions.map((option) => (
              <Link key={option.title} href={option.href} className="home-hospital-link">
                <div>
                  <strong>{option.title}</strong>
                  <p>{option.detail}</p>
                </div>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>

          <Link href="/instant-call" className="home-tele-card">
            <span className="home-tele-live">LIVE</span>
            <h3>Teleconsult</h3>
            <p>Talk to a doctor anytime, anywhere for urgent non-emergency guidance.</p>
            <span className="home-tele-action">Start Call</span>
          </Link>
        </div>
      </section>

      <section className="site-section-card">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Pharmacy Support</p>
            <h2>Order medicines or share a prescription in one step.</h2>
          </div>
        </div>

        <div className="home-utility-grid">
          <Link href="/pharmacy" className="home-utility-card">
            <div className="home-utility-icon">+</div>
            <div>
              <strong>Medicine Order</strong>
              <p>Delivered to your door from the pharmacy network.</p>
            </div>
            <span aria-hidden="true">→</span>
          </Link>

          <Link href="/records" className="home-utility-card accent">
            <div className="home-utility-icon warm">Rx</div>
            <div>
              <strong>Prescription</strong>
              <p>Upload and manage prescriptions, reports, and medical documents.</p>
            </div>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="home-highlight-grid">
        <Link href="/subscription-plans" className="home-highlight-card subscription">
          <span className="home-highlight-tag">Popular</span>
          <h3>Subscription Plan</h3>
          <p>Save up to 20% on consultations, diagnostics, and patient care services.</p>
          <strong>From ₹799</strong>
          <span className="home-highlight-action">Explore</span>
        </Link>

        <a href="tel:01244567890" className="home-highlight-card emergency">
          <span className="home-highlight-tag alert">24×7</span>
          <h3>Emergency Help</h3>
          <p>Call our emergency support line any time for urgent patient assistance.</p>
          <strong>0124 456 7890</strong>
          <span className="home-highlight-action light">Call Now</span>
        </a>
      </section>
    </CustomerSiteShell>
  );
}

export function CustomerCmsContentPage({
  slug,
  fallbackTitle,
  fallbackBody,
}: {
  slug: string;
  fallbackTitle: string;
  fallbackBody: string[];
}) {
  const [landing, setLanding] = useState(defaultLandingContent);
  const [page, setPage] = useState<CmsPageSummary | null>(null);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchPublishedCmsPageBySlug("home-landing"),
      fetchPublishedCmsPageBySlug(slug),
    ]).then(([landingResult, pageResult]) => {
      if (!active) return;
      if (landingResult.status === "fulfilled" && landingResult.value?.content) {
        setLanding(parseLandingContent(landingResult.value.content));
      }
      if (pageResult.status === "fulfilled") {
        setPage(pageResult.value);
      }
    });

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <CustomerSiteShell footer={landing.footer}>
      <LegalContent page={page} slug={slug} fallbackTitle={fallbackTitle} fallbackBody={fallbackBody} />
    </CustomerSiteShell>
  );
}

export function CustomerBlogsPage() {
  const [landing, setLanding] = useState(defaultLandingContent);
  const [blogs, setBlogs] = useState<CmsBlogSummary[]>([]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchPublishedCmsPageBySlug("home-landing"),
      fetchPublishedCmsBlogs(),
    ]).then(([landingResult, blogResult]) => {
      if (!active) return;
      if (landingResult.status === "fulfilled" && landingResult.value?.content) {
        setLanding(parseLandingContent(landingResult.value.content));
      }
      if (blogResult.status === "fulfilled") {
        setBlogs(blogResult.value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <CustomerSiteShell footer={landing.footer}>
      <SitePageIntro
        eyebrow="Latest Articles"
        title="Healthcare stories, explainers, and patient guidance"
        description="Practical guidance on consultations, diagnostics, medicines, and staying healthy at home."
      />

      <section className="landing-blog-grid landing-blog-grid-full">
        {blogs.map((blog) => (
          <article key={blog.id} className="landing-blog-card">
            {blog.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blog.image_url} alt={blog.title} className="landing-blog-image" />
            ) : null}
            <div className="landing-blog-body">
              <span>{blog.category || "Healthcare"}</span>
              <h3>{blog.title}</h3>
              <p>{blog.excerpt || contentToParagraphs(blog.content)[0] || "Read the latest patient care update."}</p>
              <div className="landing-blog-meta">
                <small>{blog.author || "Saiman Healthcare"}</small>
                <small>{formatDate(blog.published_at || blog.created_at)}</small>
              </div>
            </div>
          </article>
        ))}

        {!blogs.length ? (
          <article className="landing-blog-card landing-blog-card-empty">
            <div className="landing-blog-body">
              <span>Coming Soon</span>
              <h3>New health articles are on the way.</h3>
              <p>Check back soon for guidance on consultations, diagnostics, medicines, and home recovery.</p>
            </div>
          </article>
        ) : null}
      </section>
    </CustomerSiteShell>
  );
}

export function CustomerSupportHubPage() {
  const { user, state, configured } = useCustomerUser();
  const env = getSupabaseEnv();
  const [landing, setLanding] = useState(defaultLandingContent);
  const [supportPage, setSupportPage] = useState<CmsPageSummary | null>(null);
  const [tickets, setTickets] = useState<SupportTicketSummary[] | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Booking help");
  const [message, setMessage] = useState("");
  const [submitState, setSubmitState] = useState({ loading: false, message: "", error: "" });

  const supportTopics = useMemo(
    () => ["Booking help", "Payments and refunds", "Prescription access", "Reports and diagnostics", "General support"],
    [],
  );

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchPublishedCmsPageBySlug("home-landing"),
      fetchPublishedCmsPageBySlug("support"),
    ]).then(([landingResult, supportResult]) => {
      if (!active) return;
      if (landingResult.status === "fulfilled" && landingResult.value?.content) {
        setLanding(parseLandingContent(landingResult.value.content));
      }
      if (supportResult.status === "fulfilled") {
        setSupportPage(supportResult.value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!configured || !user?.id) {
      return () => {
        active = false;
      };
    }

    fetchSupportTickets(user.id)
      .then((rows) => {
        if (!active) return;
        setTickets(rows);
      })
      .catch(() => {
        if (!active) return;
        setTickets([]);
      });

    return () => {
      active = false;
    };
  }, [configured, user?.id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!configured || !user) {
      setSubmitState({
        loading: false,
        message: "",
        error: "Please log in with a customer account before raising a support ticket.",
      });
      return;
    }

    setSubmitState({ loading: true, message: "", error: "" });
    try {
      await createSupportTicket({
        userId: user.id,
        userEmail: user.email,
        subject,
        category,
        message,
      });

      const refreshed = await fetchSupportTickets(user.id);
      setTickets(refreshed);
      setSubject("");
      setMessage("");
      setSubmitState({ loading: false, message: "Support request submitted successfully.", error: "" });
    } catch (error) {
      setSubmitState({
        loading: false,
        message: "",
        error: error instanceof Error ? error.message : "Unable to submit support request.",
      });
    }
  }

  const supportParagraphs = safeParagraphs(supportPage?.content, [
    "Use this page for booking help, refunds, reports, and general guidance from the Saiman Healthcare support team.",
  ]);

  return (
    <CustomerSiteShell footer={landing.footer}>
      <SitePageIntro
        eyebrow="Support"
        title={supportPage?.title || "Help, support, and patient coordination"}
        description="Raise tickets, review updates, and direct visitors to the right care path from one support hub."
      />

      <section className="site-section-card support-overview-grid">
        <div className="cms-rich-text">
          {supportParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="site-highlight-list">
          {supportTopics.map((topic) => (
            <div key={topic} className="site-highlight-item">
              {topic}
            </div>
          ))}
        </div>
      </section>

      <section className="support-hub-grid">
        <article className="site-section-card">
          <div className="site-section-head">
            <div>
              <p className="site-section-eyebrow">Raise Ticket</p>
              <h2>Support request form</h2>
            </div>
          </div>

          {!env.configured ? <div className="support-note warning">Add public Supabase env values to activate customer support.</div> : null}
          {configured && state.loading ? <div className="support-note">Checking your customer session...</div> : null}
          {submitState.error ? <div className="support-note warning">{submitState.error}</div> : null}
          {submitState.message ? <div className="support-note">{submitState.message}</div> : null}

          <form onSubmit={handleSubmit} className="support-form">
            <label>
              <span>Subject</span>
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Describe the issue" required />
            </label>
            <label>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {supportTopics.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Details</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Share booking IDs, payment notes, or care context"
                required
              />
            </label>
            <button type="submit" className="primary-button" disabled={submitState.loading}>
              {submitState.loading ? "Submitting..." : configured && user ? "Submit Support Request" : "Login Required"}
            </button>
          </form>
        </article>

        <article className="site-section-card">
          <div className="site-section-head">
            <div>
              <p className="site-section-eyebrow">Your Tickets</p>
              <h2>Track recent support updates</h2>
            </div>
          </div>

          {!configured ? <div className="support-note warning">Support tickets are unavailable until Supabase is configured.</div> : null}
          {configured && !state.loading && !user ? <div className="support-note">Login with your customer account to view support tickets.</div> : null}
          {configured && user && tickets === null ? <div className="support-note">Loading your support tickets...</div> : null}

          <div className="support-ticket-list">
            {(tickets || []).map((ticket) => (
              <div key={ticket.id} className="support-ticket-card">
                <strong>{ticket.subject}</strong>
                <p>{ticket.category}</p>
                <div>
                  <span>{ticket.priority}</span>
                  <span>{ticket.status}</span>
                </div>
              </div>
            ))}
          </div>

          {configured && user && tickets && tickets.length === 0 ? (
            <div className="support-note">No support tickets yet. Submit your first request from the form.</div>
          ) : null}
        </article>
      </section>
    </CustomerSiteShell>
  );
}
