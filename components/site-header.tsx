"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { logoutCustomer } from "@/lib/customer-web-live";
import { useCustomerUser } from "@/components/customer-live";

type NavLink = { label: string; href: string };
type NavGroup = { label: string; href?: string; items?: NavLink[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Consultations",
    items: [
      { label: "Find a Doctor", href: "/doctors" },
      { label: "Instant Doctor Call", href: "/instant-call" },
      { label: "Hospitals & Surgery", href: "/hospitals" },
    ],
  },
  {
    label: "Diagnostics",
    items: [
      { label: "Lab Tests", href: "/lab-tests" },
      { label: "CT / MRI Scans", href: "/ct-mri" },
    ],
  },
  { label: "Medicines", href: "/pharmacy" },
  {
    label: "Home Care",
    items: [
      { label: "Care Staff & Nursing", href: "/care-staff/request" },
      { label: "Equipment Rental", href: "/rental-equipment" },
    ],
  },
  { label: "Emergency", href: "/ambulance" },
  {
    label: "Membership",
    items: [
      { label: "Health Card", href: "/health-card" },
      { label: "Subscription Plans", href: "/subscription-plans" },
    ],
  },
];

const PORTAL_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/" },
  { label: "My Bookings", href: "/appointments" },
  { label: "Medical Records", href: "/records" },
  { label: "Support", href: "/support" },
  { label: "Profile", href: "/profile" },
];

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onOutside]);

  return ref;
}

function NavDropdown({ group, active }: { group: NavGroup; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="app-nav-item" ref={ref}>
      <button
        type="button"
        className={`app-nav-trigger${active ? " active" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {group.label}
        <span className="app-nav-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="app-nav-menu" role="menu">
          {group.items?.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="app-nav-item" ref={ref}>
      <button
        type="button"
        className="app-icon-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        🔔
      </button>
      {open ? (
        <div className="app-nav-menu app-nav-menu-right" role="menu">
          <div className="app-notif-empty">
            <strong>No notifications yet</strong>
            <p>We&apos;ll let you know here when there&apos;s an update on your bookings.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu() {
  const router = useRouter();
  const { user, setUser, state, configured } = useCustomerUser();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const ref = useClickOutside(() => setOpen(false));

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setLogoutError("");
      await logoutCustomer();
      setUser(null);
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!configured || state.loading) {
    return <span className="app-header-status">{!configured ? "Setup required" : "Loading..."}</span>;
  }

  if (!user) {
    return (
      <div className="app-header-auth">
        <Link href="/auth/login" className="app-ghost-btn">
          Log in
        </Link>
        <Link href="/auth/signup" className="app-primary-btn">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="app-nav-item" ref={ref}>
      <button type="button" className="app-account-trigger" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="app-account-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="app-account-name">{user.name.split(" ")[0]}</span>
      </button>
      {open ? (
        <div className="app-nav-menu app-nav-menu-right" role="menu">
          <div className="app-account-summary">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          {PORTAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <button type="button" className="app-nav-menu-logout" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
          {logoutError ? <span style={{ display: "block", padding: "6px 12px 0", fontSize: "0.78rem", color: "#dc2626" }}>{logoutError}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useCustomerUser();

  return (
    <div className="app-mobile-drawer-backdrop" onClick={onClose}>
      <div className="app-mobile-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(event) => event.stopPropagation()}>
        <div className="app-mobile-drawer-head">
          <span className="app-brand-mark-sm">✚</span>
          <strong>Saiman Healthcare</strong>
          <button type="button" className="app-icon-btn" aria-label="Close menu" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="app-mobile-drawer-body">
          {user ? (
            <div className="app-mobile-section">
              <div className="app-mobile-section-label">My Account</div>
              {PORTAL_LINKS.map((item) => (
                <Link key={item.href} href={item.href} onClick={onClose} className={pathname === item.href ? "active" : ""}>
                  {item.label}
                </Link>
              ))}
            </div>
          ) : (
            <div className="app-mobile-auth">
              <Link href="/auth/login" onClick={onClose} className="app-ghost-btn">
                Log in
              </Link>
              <Link href="/auth/signup" onClick={onClose} className="app-primary-btn">
                Sign up
              </Link>
            </div>
          )}

          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="app-mobile-section">
              <div className="app-mobile-section-label">{group.label}</div>
              {group.href ? (
                <Link href={group.href} onClick={onClose} className={pathname === group.href ? "active" : ""}>
                  {group.label}
                </Link>
              ) : (
                group.items?.map((item) => (
                  <Link key={item.href} href={item.href} onClick={onClose} className={pathname === item.href ? "active" : ""}>
                    {item.label}
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteHeader({ mode }: { mode: "public" | "portal" }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCustomerUser();
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/doctors?q=${encodeURIComponent(trimmed)}` : "/doctors");
  }

  return (
    <header className="app-header">
      <div className="app-header-bar">
        <Link href="/" className="app-brand">
          <span className="app-brand-mark">✚</span>
          <span className="app-brand-copy">
            <strong>Saiman Healthcare</strong>
            <small>Patient Care Platform</small>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Primary services">
          {NAV_GROUPS.map((group) =>
            group.href ? (
              <Link key={group.label} href={group.href} className={`app-nav-trigger${pathname === group.href ? " active" : ""}`}>
                {group.label}
              </Link>
            ) : (
              <NavDropdown key={group.label} group={group} active={Boolean(group.items?.some((item) => item.href === pathname))} />
            ),
          )}
        </nav>

        <form className="app-search" onSubmit={handleSearch} role="search">
          <span className="app-search-icon" aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search doctors, tests, medicines..."
            aria-label="Search Saiman Healthcare"
          />
        </form>

        <div className="app-header-actions">
          <Link href="/support" className="app-icon-btn app-icon-btn-desktop" aria-label="Support">
            💬
          </Link>
          <div className="app-icon-btn-desktop">
            <NotificationsMenu />
          </div>
          <div className="app-header-auth-desktop">
            <AccountMenu />
          </div>
          <button type="button" className="app-menu-toggle" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
            ☰
          </button>
        </div>
      </div>

      {mode === "portal" && user ? (
        <nav className="portal-subnav" aria-label="Patient portal">
          {PORTAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {drawerOpen ? <MobileDrawer onClose={() => setDrawerOpen(false)} /> : null}
    </header>
  );
}
