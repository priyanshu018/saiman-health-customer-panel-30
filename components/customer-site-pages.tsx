"use client";

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
  fetchPublishedCmsBlogs,
  fetchPublishedCmsPageBySlug,
  parseLandingContent,
  type CmsBlogSummary,
  type CmsPageSummary,
  type LandingContent,
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
      <p>{description}</p>
    </section>
  );
}

function LegalContent({ page, fallbackTitle, fallbackBody }: { page: CmsPageSummary | null; fallbackTitle: string; fallbackBody: string[] }) {
  const title = page?.title || fallbackTitle;
  const paragraphs = safeParagraphs(page?.content, fallbackBody);

  return (
    <article className="cms-page-card">
      <SitePageIntro
        eyebrow="CMS Page"
        title={title}
        description="This content is designed to be controlled by super admin from the CMS pages module."
      />

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

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchPublishedCmsPageBySlug("home-landing"),
      fetchPublishedCmsPageBySlug("about-us"),
      fetchPublishedCmsBlogs(3),
      fetchServiceSnapshot(),
    ]).then((results) => {
      if (!active) return;

      const [landingResult, aboutResult, blogResult, serviceResult] = results;

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
    });

    return () => {
      active = false;
    };
  }, []);

  const aboutParagraphs = safeParagraphs(aboutPage?.content, [landing.about.description]);
  const serviceCards = [
    { title: "Doctor Consultation", count: services.doctors, href: "/doctors", detail: "Approved doctors available for consult bookings." },
    { title: "Pharmacy", count: services.pharmacy, href: "/pharmacy", detail: "Medicine and wellness products managed through providers." },
    { title: "Lab Tests", count: services.labTests, href: "/lab-tests", detail: "Diagnostics and collection options ready for patients." },
    { title: "Hospital Services", count: services.hospitals, href: "/hospitals", detail: "Hospital and surgery listings kept live by approvals." },
    { title: "Imaging", count: services.imaging, href: "/ct-mri", detail: "CT and MRI center approvals available in the portal." },
    { title: "Care Staff & Equipment", count: services.staffing + services.rental, href: "/care-staff", detail: "Nursing, attendants, and recovery equipment support." },
  ];

  return (
    <CustomerSiteShell footer={landing.footer}>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-pill">{landing.hero.eyebrow}</span>
          <h1>{landing.hero.title}</h1>
          <p>{landing.hero.description}</p>
          <div className="landing-action-row">
            <Link href={landing.hero.primaryAction.href} className="primary-button">
              {landing.hero.primaryAction.label}
            </Link>
            <Link href={landing.hero.secondaryAction.href} className="ghost-button">
              {landing.hero.secondaryAction.label}
            </Link>
          </div>
          <div className="landing-stat-grid">
            {landing.hero.stats.map((stat) => (
              <div key={stat.label} className="landing-stat-card">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-hero-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={landing.hero.imageUrl} alt="Saiman Healthcare landing" />
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

      <section id="services" className="site-section-card">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Services @ Home</p>
            <h2>Dynamic service visibility powered by provider approvals.</h2>
          </div>
          <Link href="/support" className="pill-link">
            Need help choosing?
          </Link>
        </div>

        <div className="landing-service-grid">
          {serviceCards.map((service) => (
            <Link key={service.title} href={service.href} className="landing-service-card">
              <span className="landing-service-count">{service.count || "Live"}</span>
              <strong>{service.title}</strong>
              <p>{service.detail}</p>
              <small>Explore service</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="site-section-card">
        <div className="site-section-head">
          <div>
            <p className="site-section-eyebrow">Blogs</p>
            <h2>Latest content managed by super admin.</h2>
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
                <span>CMS ready</span>
                <h3>Published blogs will appear here.</h3>
                <p>Use the super admin CMS blog manager to add marketing articles, recovery education, and announcements.</p>
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
      <LegalContent page={page} fallbackTitle={fallbackTitle} fallbackBody={fallbackBody} />
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
        description="Published blog posts from the CMS will appear here automatically for patients and visitors."
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
              <p>{blog.excerpt || contentToParagraphs(blog.content)[0] || "Published content from the CMS."}</p>
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
              <span>No published blogs</span>
              <h3>Use the CMS blogs screen to publish articles.</h3>
              <p>Once a blog is marked as Published in the super admin panel, it will show up here.</p>
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
