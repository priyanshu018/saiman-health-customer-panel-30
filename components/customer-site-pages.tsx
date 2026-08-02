"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CustomerSiteShell } from "@/components/customer-site-shell";
import { useCustomerUser } from "@/components/customer-live";
import {
  createSupportTicket,
  fetchApprovedCtmriServices,
  fetchApprovedDoctors,
  fetchApprovedHospitalServices,
  fetchApprovedLabTests,
  fetchApprovedPharmacyProducts,
  fetchApprovedRentalEquipment,
  fetchApprovedStaffingProviders,
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
  subscribeServiceCardSettings,
  trackBannerClick,
  type CmsBannerSummary,
  type CmsBlogSummary,
  type CmsPageSummary,
  type LandingContent,
  type ServiceCardSetting,
  type ServiceSnapshot,
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

function defaultServices(): ServiceSnapshot {
  return {
    doctors: 0,
    pharmacy: 0,
    labTests: 0,
    hospitals: 0,
    imaging: 0,
    rental: 0,
    staffing: 0,
  };
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

async function fetchServiceSnapshot(): Promise<ServiceSnapshot> {
  const [doctors, pharmacy, labTests, hospitals, imaging, rental, staffing] = await Promise.allSettled([
    fetchApprovedDoctors(),
    fetchApprovedPharmacyProducts(),
    fetchApprovedLabTests(),
    fetchApprovedHospitalServices(),
    fetchApprovedCtmriServices(),
    fetchApprovedRentalEquipment(),
    fetchApprovedStaffingProviders(),
  ]);

  return {
    doctors: doctors.status === "fulfilled" ? doctors.value.length : 0,
    pharmacy: pharmacy.status === "fulfilled" ? pharmacy.value.length : 0,
    labTests: labTests.status === "fulfilled" ? labTests.value.length : 0,
    hospitals: hospitals.status === "fulfilled" ? hospitals.value.length : 0,
    imaging: imaging.status === "fulfilled" ? imaging.value.length : 0,
    rental: rental.status === "fulfilled" ? rental.value.length : 0,
    staffing: staffing.status === "fulfilled" ? staffing.value.length : 0,
  };
}

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
  const [landing, setLanding] = useState<LandingContent>(defaultLandingContent);
  const [aboutPage, setAboutPage] = useState<CmsPageSummary | null>(null);
  const [blogs, setBlogs] = useState<CmsBlogSummary[]>([]);
  const [services, setServices] = useState<ServiceSnapshot>(defaultServices());
  const [homeBanners, setHomeBanners] = useState<CmsBannerSummary[]>([]);
  const [activeHomeBannerIndex, setActiveHomeBannerIndex] = useState(0);
  const [serviceSettings, setServiceSettings] = useState<ServiceCardSetting[]>([]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchPublishedCmsPageBySlug("home-landing"),
      fetchPublishedCmsPageBySlug("about-us"),
      fetchPublishedCmsBlogs(3),
      fetchServiceSnapshot(),
      fetchHomeBanners("Home Banner"),
      fetchServiceCardSettings(),
    ]).then((results) => {
      if (!active) return;

      const [landingResult, aboutResult, blogResult, serviceResult, bannerResult, settingsResult] = results;

      if (landingResult.status === "fulfilled" && landingResult.value?.content) {
        setLanding(parseLandingContent(landingResult.value.content));
      }

      if (aboutResult.status === "fulfilled") {
        setAboutPage(aboutResult.value);
      }

      if (blogResult.status === "fulfilled") {
        setBlogs(blogResult.value);
      }

      if (serviceResult.status === "fulfilled") {
        setServices(serviceResult.value);
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
  useEffect(() => subscribeServiceCardSettings(setServiceSettings), []);

  useEffect(() => {
    if (homeBanners.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveHomeBannerIndex((current) => (current + 1) % homeBanners.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [homeBanners.length]);

  const aboutParagraphs = safeParagraphs(aboutPage?.content, [landing.about.description]);
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
  const serviceCards = [
    { title: "Doctor Consultation", count: services.doctors, href: "/doctors", detail: "Verified doctors available for online and clinic consultations." },
    { title: "Pharmacy", count: services.pharmacy, href: "/pharmacy", detail: "Medicines and wellness products with doorstep delivery." },
    { title: "Lab Tests", count: services.labTests, href: "/lab-tests", detail: "Diagnostics with home collection or center visits." },
    { title: "Hospital Services", count: services.hospitals, href: "/hospitals", detail: "Verified hospitals and surgery centers near you." },
    { title: "Imaging", count: services.imaging, href: "/ct-mri", detail: "CT and MRI scans at verified diagnostic centers." },
    { title: "Care Staff & Equipment", count: services.staffing + services.rental, href: "/care-staff", detail: "Nursing, attendants, and recovery equipment support." },
  ];

  return (
    <CustomerSiteShell footer={landing.footer}>
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

        <article className="mobile-home-side-card">
          {featuredBlog?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featuredBlog.image_url} alt={featuredBlog.title} className="mobile-home-side-image" />
          ) : (
            <div className="mobile-home-side-image mobile-home-side-image-fallback" />
          )}
          <span className="mobile-home-side-tag">{featuredBlog?.category || "Health Blog"}</span>
          <h2>{featuredBlog?.title || "How to prepare for a Lab Test"}</h2>
          <p>{featuredBlog?.excerpt || "Simple steps to get more accurate lab results before your next test."}</p>
        </article>
      </section>

      <section className="mobile-home-services-section">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Our Services</p>
          </div>
          <Link href="/support" className="pill-link">
            Need help?
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

      <section id="about" className="site-section-card site-section-split">
        <div>
          <p className="site-section-eyebrow">{landing.about.eyebrow}</p>
          <h2>{aboutPage?.title || landing.about.title}</h2>
          {aboutParagraphs.map((paragraph) => (
            <p key={paragraph} className="site-section-copy">
              {paragraph}
            </p>
          ))}
          <div className="site-highlight-list">
            {landing.about.highlights.map((item) => (
              <div key={item} className="site-highlight-item">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="site-photo-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={landing.about.imageUrl} alt="About Saiman Healthcare" />
        </div>
      </section>

      <section className="site-section-card">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Blogs</p>
            <h2>Health tips and updates from our care team.</h2>
          </div>
          <Link href="/blogs" className="pill-link">
            View all blogs
          </Link>
        </div>

        <div className="landing-blog-grid">
          {(blogs.length ? blogs : []).map((blog) => (
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
