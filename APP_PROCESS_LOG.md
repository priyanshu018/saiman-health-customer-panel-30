# Customer Web Panel — Process Log

## Project Overview

- **Purpose**: Customer-facing web panel for Saiman Healthcare — a healthcare marketplace covering doctor consultations, instant calls, pharmacy, lab tests, imaging, hospitals/surgery, ambulance, equipment rental, home staffing, health cards, medical records, and support.
- **Related projects**:
  - Mobile (functional source of truth): `/Users/primedepthlabs/PDL/Project_Under_30K/Saiman-healthcare/Saiman-Customer`
  - Admin (backend/business-rule authority): `/Users/primedepthlabs/PDL/Project_Under_30K/Saiman-healthcare/Saiman-Health-Admin-Panel`
- **Shared backend**: single Supabase project (Postgres + Auth + Storage + Realtime). All three apps read/write the same tables under a polymorphic `users` table keyed by `role`. See `CUSTOMER_WEB_PARITY_AUDIT.md` for the full backend surface (tables, RPCs, storage buckets, status enums) as discovered by direct code audit.
- **Fourth system (unaudited)**: an external "call server" (`NEXT_PUBLIC_CALL_SERVER_URL`, currently `https://www.austyhealthcare.com`) brokers Razorpay payment order creation/verification and Agora video/voice for both mobile and web. Its source is not in any of the three audited repos.

## Current Status

**Overall completion**: Partially completed. Audit phase done; P0 payment/booking-persistence fix implemented and verified (2026-08-01). Remaining modules not yet started (see "Remaining Work").

**Fully working (real backend read+write, matches admin panel's expectations)**:
- CMS-driven homepage, about/privacy/terms/support pages, blogs listing (`cms_pages`, `cms_blogs`)
- Support tickets — creation, listing, attachments (`support_tickets`, `support_ticket_messages`, `support-media` bucket)
- Instant doctor call — request creation, status polling (`request_instant_call` RPC, `instant_call_requests`) — missing connecting/in-progress transitions and cancel
- **Doctor booking** — real listing/detail, real date/time picker, real Razorpay checkout via first-party `/api/payments/*` routes, **now inserts a real `doctor_appointments` row and links it to `customer_transactions` on payment success**
- **Pharmacy checkout** — real catalog/cart, real delivery-address capture, real Razorpay checkout, **now inserts real `pharmacy_orders` + `pharmacy_order_items` rows and links to `customer_transactions`**; `/pharmacy/orders` now reads live data instead of `localStorage`

**Working but incomplete**:
- Auth — login/logout/signup work, but no OTP, no forgot/reset password, no duplicate-account precheck

**Read-only / browse-only (catalog fetch works, no booking action wired)**:
- Lab tests, hospitals/surgery, CT/MRI, rental equipment, home staffing

**Entirely static/mock (no backend connection at all)**:
- Ambulance booking, health cards, subscription plans, medical records

**Missing entirely**:
- Unified customer dashboard, unified order/booking history, per-user notifications, reviews/ratings, video/chat consultation, transaction history, refund status display

**External blockers**: see bottom of this file.

## Work Completed

### 2026-08-01 — Audit & documentation baseline
- **Module**: Cross-project audit (Step 1–3 of working instructions)
- **Files changed**: `CUSTOMER_WEB_PARITY_AUDIT.md` (created), `APP_PROCESS_LOG.md` (created), `.env.example` (created), `README.md` (removed leaked DB credential — not yet committed)
- **Backend used**: none (read-only audit)
- **Functionality implemented**: none — this session was audit-only
- **Bugs found**: `localStorage`-only persistence for doctor bookings and pharmacy orders (payment succeeds, no durable booking row); hardcoded doctor rating (4.8); hardcoded appointment slot/delivery address in web checkout flows
- **Security improvements**: removed a committed Postgres connection string (with password) from `README.md` working copy — **DB password still needs manual rotation, and the removal still needs to be committed**
- **Responsive changes**: none this session
- **Tests performed**: none — code-reading audit only, no runtime verification yet
- **Build status**: not run this session

### 2026-08-01 — P0 fix: first-party payments + real booking persistence
- **Module**: Payments architecture, doctor booking, pharmacy checkout
- **Decision**: per stakeholder direction, migrated off the unaudited external call-server for payments and built first-party Razorpay integration, mirroring `Saiman-Health-Admin-Panel`'s existing working pattern exactly (same `customer_transactions` table, same HMAC verification, same Razorpay REST calls).
- **Files added**:
  - `lib/payment-transactions.ts` — server-only Razorpay + `customer_transactions` helpers (order creation, verification, entity linking)
  - `app/api/payments/create-order/route.ts`, `verify/route.ts`, `checkout/route.ts`, `link-booking/route.ts` — first-party Route Handlers
- **Files changed**:
  - `lib/web-payments.ts` — now calls same-origin `/api/payments/*` instead of `NEXT_PUBLIC_CALL_SERVER_URL`; added `linkTransactionToEntity`; `PendingPayment.order` type extended with `pharmacyId`, `subtotal`, `deliveryFee`, `deliveryAddress`
  - `lib/customer-web-live.ts` — added `createDoctorAppointment`, `createPharmacyOrder`, `fetchPatientPharmacyOrders` (ported from mobile app's `lib/doctorConsultations.ts` / `lib/pharmacyMarketplace.ts`, same table/column shapes)
  - `components/web-app-experience.tsx` — `WebDoctorDetailScreen` now has a real date/time picker (was hardcoded to a past date); `WebPharmacyCartScreen` now captures a real delivery address (was hardcoded); `PaymentCallbackInner` now inserts a real `doctor_appointments`/`pharmacy_orders` row and calls `linkTransactionToEntity` on payment success instead of writing to `localStorage`; `WebAppointmentsScreen` and `WebPharmacyOrdersScreen` now read only live Supabase data; removed the `getCallServerBase()` misconfiguration guards (no longer applicable)
  - `lib/mobile-web-state.ts` — removed dead `LocalDoctorBooking`/`LocalPharmacyOrder` local-storage code (superseded by real inserts); cart-only local state remains (no real "cart" table exists, matches mobile's own local-cart pattern)
  - `.env`, `.env.example` — added `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (same test-mode Razorpay account already used by the admin panel)
- **Files deleted**: `components/mobile-experience.tsx` (1415 lines, confirmed dead code — not imported by any route, and depended on the now-removed local-storage booking functions)
- **Backend used**: `customer_transactions` (new for this app), `doctor_appointments`, `pharmacy_orders`, `pharmacy_order_items` (now actually written to, not just read)
- **Functionality implemented**: doctor booking and pharmacy checkout now create durable, admin-visible rows on verified payment. This closes the money-in/no-fulfillment gap identified in the audit.
- **Bugs fixed**: hardcoded past appointment date (`2026-07-26`, already elapsed relative to the current date) replaced with a real picker; hardcoded pharmacy delivery address replaced with a real field
- **Security improvements**: Razorpay secret key and Supabase service-role key are used only in server-side Route Handlers (`app/api/payments/*`), never in `"use client"` files; service-role key uses the correctly-named `SUPABASE_SERVICE_ROLE_KEY` only (no `NEXT_PUBLIC_` fallback, unlike the admin panel's naming)
- **Tests performed**: `npx tsc --noEmit` (clean), `npm run lint` (clean), `npm run build` (succeeds, all 4 payment routes registered as dynamic), manual `curl` smoke test confirming `/`, `/doctors` return 200 and `/api/payments/create-order` correctly rejects unauthenticated requests. **Not yet tested**: an actual end-to-end Razorpay checkout with a real browser session (needs manual verification with a logged-in test user).
- **Build status**: passing (`next build` succeeds cleanly)
- **Not done in this pass**: refund flow, transaction history page, duplicate-payment idempotency beyond what the ported admin logic already provides — see Remaining Work

### 2026-08-01 — Staffing + instant-call functional parity, doctor rating data-quality fix
- **Module**: Home care/staffing (new), instant doctor call (rebuilt), doctor rating display
- **Context**: stakeholder flagged that browse-only "Request staff" / basic instant-call form did not match the mobile app's actual workflows, and asked for these two specifically as high priority before a broader UI redesign.
- **Reference implementations inspected before writing any code**: `Saiman-Customer/lib/staffingService.ts`, `app/staffing/{need-staff,schedule,review,_shared}.tsx`, `lib/instantCall.ts`, `app/(tabs)/instant-call.tsx`; `Saiman-Health-Admin-Panel/lib/staffing-marketplace.ts` for the admin-side dispatch model and payment-status defaults.
- **Files added**: `app/care-staff/request/page.tsx`, `app/care-staff/bookings/page.tsx`
- **Files changed**: `lib/customer-web-live.ts` (added `createStaffingBooking`, `fetchPatientStaffingBookings`, `subscribeToPatientStaffingBookings`, `STAFF_TYPES`, `STAFFING_DURATIONS`, `markInstantCallConnecting`, `markInstantCallInProgress`, `cancelInstantCallRequest`, `subscribeToInstantCallRequest`, `fetchInstantCallHistory`, doctor-join on `fetchActiveInstantCallRequest`; replaced hardcoded doctor `rating: 4.8` with a real `doctor_reviews` aggregate query; replaced all "City pending" fallbacks with "Location not specified"); `components/web-app-experience.tsx` (new `WebStaffingRequestScreen`, `WebStaffingBookingsScreen`; rebuilt `WebCareStaffScreen` CTAs to link to the real flow instead of a static label; fully rebuilt `WebInstantCallScreen` with the searching/assigned/doctor-accepted/connecting/in-progress state machine, join/cancel actions, and a recent-requests history list; removed hardcoded `⭐ 4.8` in two places in favor of real rating + review count)
- **Backend used**: `staffing_bookings`, `staffing_booking_items` (new writes), `instant_call_requests` (RPCs `mark_instant_call_connecting`, `cancel_instant_call`; existing `request_instant_call` now paired with realtime + history reads), `doctor_reviews` (new read)
- **Key decision — staffing payment model**: mobile's `createStaffingBooking()` hardcodes `payment_status: 'paid'` on every insert even when `estimatedPrice`/`totalAmount` are `0` and `paymentMethod` is `'Admin Assignment'` — i.e., it marks unpaid ₹0 requests as "paid", which is incorrect. Evidence against copying this: (1) `customer_transactions.service_type` in the admin panel's payment library has no `staffing_booking` entry, so staffing was never wired into the verified-payment path; (2) the admin panel's own read path (`lib/staffing-marketplace.ts`) defaults `payment_status` to `'pending'` when reading, i.e., admin's own code expects `'pending'` to be the normal starting state. **Web now creates staffing bookings with `payment_status: 'pending'`, `status: 'Pending'`, zeroed pricing fields, and no `staff_id`** — a genuine request-first flow where the admin dispatch team assigns a provider and confirms pricing afterward, matching the admin's actual `StaffingDispatchScreen` workflow instead of mobile's inconsistent shortcut.
- **Key decision — instant call video/voice**: `mark_instant_call_in_progress` is intentionally never called from the web app. "Join Call" calls `mark_instant_call_connecting` (matching when mobile calls it), but there is no Agora/call-server session on web to back an "in progress" claim — calling that RPC without a real call would be lying about state. The connecting-state UI explicitly tells the customer that live calling is available in the mobile app for now. This remains a genuine external blocker (see below), not an implementation gap.
- **Bugs fixed**: hardcoded `4.8` doctor rating (now computed from visible `doctor_reviews`); "City pending" shown to customers in 10 places across doctors/pharmacies/labs/hospitals/ctmri/rental/staffing listings (now "Location not specified")
- **Responsive changes**: none — not verified across breakpoints this session (see completion matrix)
- **Tests performed**: `npx tsc --noEmit` (clean), `npm run lint` (clean, after fixing a `react-hooks/set-state-in-effect` error and an unused-import warning introduced by the new instant-call screen), `npm run build` (succeeds, `/care-staff/request` and `/care-staff/bookings` registered as static routes), manual `curl` smoke test confirming all new/changed routes return 200. **Not tested**: an actual staffing request or instant-call request submitted through a real logged-in browser session against live data (needs a test patient account and, for instant call, an online test doctor).
- **Build status**: passing
- **Explicitly not done this session**: design-system token rework, app-shell/navigation replacement, homepage rebuild, and every other module's UI/workflow completion (lab, hospital, CT/MRI, rental, ambulance, health card, subscription plans, medical records, unified dashboard/history, notifications, reviews submission, CMS FAQs/banners) — seeded as fresh work in the priority list carried over from the stakeholder's latest instructions

### 2026-08-01 — Design system foundation + app shell replacement
- **Module**: Shell architecture (Phase 2 of the latest instructions — see "Design System" section above for full detail)
- **Files added**: `components/site-header.tsx`, `components/site-footer.tsx`
- **Files changed**: `app/globals.css` (extended tokens; replaced sidebar/old-header CSS with new `.app-*` shell classes); `components/customer-site-shell.tsx` (rewritten to use `SiteHeader`/`SiteFooter`, no sidebar); `components/web-app-experience.tsx` (`DashboardFrame` rewritten to use `SiteHeader mode="portal"`, no sidebar; removed now-orphaned `styles.*` keys for the old sidebar/topnav; ~23 instances of developer-facing copy rewritten to patient-facing language across doctor/pharmacy/lab/CT-MRI/hospital/rental/health-card/ambulance/subscription/support/appointments/profile screens; added a negative-experience guard on staffing provider cards)
- **Files deleted**: `components/customer-shell.tsx` (confirmed fully dead — zero references anywhere in the app)
- **Functionality implemented**: unified header/navigation shared by all 34 routes (public and authenticated); functional header search (`/doctors?q=...`); account menu with real logout; notifications dropdown with an honest empty state (no fake data); mobile drawer navigation
- **Bugs fixed**: two independently-coded, duplicated sidebar implementations (one with letter-only nav icons) collapsed into one; ~23 instances of copy describing the implementation ("same as the app", "web view", "web-friendly", "managed by super admin") rewritten to describe the actual customer benefit instead
- **Responsive changes**: header/dropdowns/mobile drawer built responsive from the start (flex-wrap, a 900px breakpoint switching between desktop nav and mobile hamburger+drawer, 44px minimum touch targets on icon buttons) — but **not independently verified** against the full 320px–1920px checklist requested
- **Accessibility**: dropdowns use `aria-haspopup`/`aria-expanded`, close on outside click and `Escape`; mobile drawer uses `role="dialog"` + `aria-modal`; account/notification menus use `role="menu"`/`role="menuitem"` — not independently audited beyond this
- **Regression testing performed**: full 26-route `curl` 200 check (including `/care-staff/request`, `/care-staff/bookings`, `/instant-call`, `/doctors/[id]`, `/pharmacy/cart`, `/payment-callback`); grepped rendered HTML to confirm zero remaining references to the old sidebar markup on both a public page (`/`) and a portal page (`/doctors`); did **not** manually click through doctor booking, pharmacy checkout, staffing request, or instant-call request end-to-end this session (would require a live logged-in session — same caveat as prior sessions)
- **Tests performed**: `npx tsc --noEmit` (clean, both mid-refactor and final), `npm run lint` (clean), `npm run build` (succeeds, all 34 routes)
- **Build status**: passing
- **Explicitly not done this session**: full component library, homepage rebuild, per-page visual redesign of the CSS-in-JS content areas, full responsive/accessibility verification — see "What this pass did not do" in the Design System section above

## UI & Workflow Completion Matrix

This matrix was requested to track UI polish and functional parity separately — a module is not "done" unless both are complete. Only modules touched or newly assessed this session are scored in detail; everything else keeps its status from the parity audit's browse-only/static classification (§6–§13 of `CUSTOMER_WEB_PARITY_AUDIT.md`).

| Module | UI Status | Workflow Status | Backend Status | Responsive Status | Verification |
|---|---|---|---|---|---|
| Staffing / Home Care | New: sectioned request form (staff-type picker with counters, schedule, address, patient details) + real history cards. Not yet passed through a full visual design-system pass (reuses existing shared `styles` tokens, no new component library work). | Complete: category → schedule → review → submit → durable `staffing_bookings`/`staffing_booking_items` row → realtime status in history. Payment intentionally left `pending` (see decision note below), matching admin's actual model — not "paid" like mobile's insert. | `staffing_bookings`, `staffing_booking_items`, realtime `postgres_changes` on `staffing_bookings` | Not manually verified across breakpoints this session (built with the same responsive grid/section primitives as existing pages, but 320px–1920px pass not run) | Typecheck/lint/build pass; manual `curl` 200 on `/care-staff`, `/care-staff/request`, `/care-staff/bookings`; real click-through booking creation not manually tested |
| Instant Doctor Call | New: full-state panel (searching/assigned/doctor-accepted/connecting/in-progress copy), specialty picker, recent-requests list. Same caveat — reuses existing tokens, no new design-system pass. | Complete except live audio/video: request creation, duplicate-guard (via existing active-request check), realtime status via `postgres_changes`, cancel, "Join Call" → `mark_instant_call_connecting`. **`mark_instant_call_in_progress` intentionally not called from web** — no real Agora/call-server session exists to back that state; calling it would fabricate a state that isn't true. Call history added (mobile itself doesn't have this screen). | `instant_call_requests`, RPCs `request_instant_call`, `mark_instant_call_connecting`, `cancel_instant_call`; realtime `postgres_changes` | Not manually verified across breakpoints this session | Typecheck/lint/build pass; manual `curl` 200 on `/instant-call`; live RPC round-trip (assignment, doctor acceptance) not manually tested — requires an online test doctor account |
| Doctor listing/detail | Real ratings now computed from `doctor_reviews` (was hardcoded `4.8`); experience/rating fallback copy cleaned up ("New on Saiman" instead of a fake number, "Experience on file" instead of a negative/zero value reading oddly) | Unchanged this session (booking flow already fixed in the prior P0 session) | `doctor_reviews` (new read), `doctor_appointments` | Not touched | Covered by the same build/typecheck pass |
| App shell / navigation (all 34 routes) | New: unified header (mega-menu-style service nav, search, notifications, account menu) shared by public and authenticated pages; mobile drawer replaces the old sidebar; no more letter-only nav icons | N/A (structural, not a booking flow) | No backend change | Built responsive from the start (900px breakpoint), not independently verified against the full checklist | Typecheck/lint/build pass; 26-route curl 200 check; grepped rendered HTML on public + portal pages to confirm zero old-sidebar markup remains |
| Customer-facing copy (all screens) | ~23 developer-facing phrases ("same as the app", "web view", "managed by super admin") rewritten to patient-facing language | N/A | No backend change | N/A | Covered by the same build/typecheck pass |
| Homepage, per-page visual redesign, full component library (30+ components), page-by-page card/form/banner rework | **Not attempted this session** — see "What this pass did not do" in the Design System section | **N/A** | Unchanged | Unchanged | Unchanged |
| All booking modules (lab, hospital, CT/MRI, rental, ambulance, health card, subscription plans, medical records, unified dashboard/history, notifications, CMS FAQs/banners) | **Not touched this session** | **Not touched this session** | Unchanged from parity audit | Unchanged | Unchanged |

**Design system / app shell decision**: Phase 2 (design tokens, component library) and Phase 3 (app shell replacement) from this session's instructions were **deliberately not attempted**. Reworking the shell, homepage, and every page's visual hierarchy properly is a large, high-risk UI project on its own; doing it superficially in the time remaining after the two explicitly-flagged high-priority functional modules would have produced exactly the "different colors, more border-radius" surface change the instructions said not to do. It needs its own dedicated pass — see Remaining Work.

## Design System (added 2026-08-01)

**Scope note**: this pass covered shell architecture (the #1 visible complaint — "looks like an admin dashboard") plus copy cleanup. It deliberately did **not** attempt the full 30+ component library, homepage rebuild, or per-page visual redesign described in the source instructions — see "What this pass did not do" below.

### Tokens (`app/globals.css` `:root`)
Extended the existing semantic token set (kept, did not replace, so nothing depending on `--brand`/`--ink`/etc. broke):
- **Color**: added `--warning`/`--warning-soft`, `--info`/`--info-soft`, `--muted-tertiary`, `--focus-ring`, `--surface-muted`, `--accent-strong`. Shifted `--brand` from a generic SaaS blue (`#2563eb`) to a deeper clinical navy-blue (`#1d4ed8`) and `--accent`/`--success` to a more clinical green (`#0f8a5f` from `#22a36a`). Because every existing screen already consumes these variables (not hardcoded hex), this alone shifts the visual tone app-wide without touching per-page code.
- **Typography scale**: `--text-display` through `--text-button` as CSS shorthand custom properties (not yet applied everywhere — see below).
- **Spacing**: 4px-based scale, `--space-1` through `--space-16`.
- **Radius**: `--radius-sm/md/lg/pill`.
- **Shadows**: split the old single `--shadow` into `--shadow-card`, `--shadow-floating`, `--shadow-modal`, `--shadow-sticky` plus the existing `--shadow`/`--shadow-strong`/`--shadow-brand`.
- **Containers**: `--container-narrow/standard/wide`.
- **Motion**: `--motion-fast`/`--motion-standard`, with a `prefers-reduced-motion` override zeroing both.

### Component library
Only built what the shell needed, not the full 30-component list from the instructions:
- `components/site-header.tsx` — `<SiteHeader mode="public" | "portal" />`, used by every route
- `components/site-footer.tsx` — extracted from the old `CustomerSiteShell` (same content, now reusable)
- Existing primitives (`.primary-button`, `.ghost-button`, `.pill-link`, `.empty-state`, `.inline-alert`, `.skeleton-shimmer`, `.status-chip`, `.field`) were already present in `globals.css` from before this session but were **not** consistently used by the live app (the interactive screens in `web-app-experience.tsx` use a separate ~2500-line CSS-in-JS `styles` object). This pass did not unify those two systems — see below.

### Shell architecture — the main structural change
**Before**: three parallel, partially-duplicated shell implementations:
1. `components/customer-shell.tsx` (`CustomerShell`) — fully dead code, unused by any route
2. `components/customer-site-shell.tsx` (`CustomerSiteShell`) — real, wrapped public/marketing pages, had its own left-sidebar markup
3. `DashboardFrame` (inline in `web-app-experience.tsx`) — real, wrapped every authenticated screen, had a **second, separately-coded** left-sidebar with letter-only nav icons (`item.label.slice(0,1)` — the "D, P, L, C, R" problem called out explicitly)

**After**: one shared header component (`SiteHeader`), used by both. No sidebar anywhere.
- Deleted `components/customer-shell.tsx` (dead code)
- `CustomerSiteShell` and `DashboardFrame` both now render `<SiteHeader mode="..." />` and nothing else shell-related
- Because **every** route in the app already funnels through one of these two wrapper components, replacing just the two wrappers migrated all 34 routes to the new shell without touching each route file — this was the deliberate leverage point for "migrate all routes" rather than moving 25 folders into a route group

### Navigation model
- **Desktop header**: logo, 6 grouped service-discovery nav items (Consultations, Diagnostics, Medicines, Home Care, Emergency, Membership — click-to-open dropdowns for multi-page groups, direct links for single-page groups), a functional search box (submits to `/doctors?q=...`), a notifications bell (real dropdown with an honest "No notifications yet" empty state — no per-user notification table exists yet, so this deliberately does not fabricate data), a support icon, and an account menu.
- **Account menu**: logged-out shows Log in/Sign up; logged-in shows an avatar + name trigger opening a dropdown with account links and Logout.
- **Portal sub-nav**: a second row (Dashboard, My Bookings, Medical Records, Support, Profile) shown only when logged in — service-discovery and account-management links are no longer mixed in one list, per the explicit instruction. **"Payments" was intentionally omitted** from this list — there's no transaction history page yet (still pending, see Remaining Work), and linking to a page that doesn't exist would itself be a "fake button."
- **Mobile**: header collapses to logo + hamburger; a slide-in drawer (not a persistent sidebar) holds account links (if logged in) and all 6 service groups, flattened.

### What this pass did not do (explicitly out of scope, not silently skipped)
- The ~2500-line CSS-in-JS `styles` object inside `web-app-experience.tsx` (used by every screen's content area — doctor cards, pharmacy grid, forms, etc.) was **not** migrated to the CSS-class component system. It still works, and now references the updated color tokens, but its visual structure (spacing, card hierarchy, banner-per-page pattern) is unchanged.
- Homepage was **not** rebuilt into the 19-section structure described in the source instructions. It still uses its pre-existing CMS-driven landing sections.
- No new Button/Input/Select/Modal/Drawer/Stepper/etc. component library — only what `SiteHeader` itself needed.
- No page-by-page visual redesign (doctor cards, service cards, forms) — still using pre-existing markup/styles, just under the new shell and new color tokens.
- Full responsive verification across all 8 breakpoints and a full accessibility audit were **not** performed — the header/drawer/dropdowns were built with `aria-haspopup`/`aria-expanded`, keyboard `Escape`-to-close, and 44px minimum touch targets, but this was not independently verified against a checklist.

## Backend Reference

See `CUSTOMER_WEB_PARITY_AUDIT.md` §1–§22 for the full, grouped-by-module inventory of tables, RPCs, storage buckets, realtime channels, and verbatim status-enum values (ground truth extracted from the admin panel's SQL migrations and code). Key points:
- Status enum casing is **inconsistent per table** (e.g. `staffing_bookings` and `support_tickets` use Title Case, most others use lower_snake_case) — do not assume a single vocabulary.
- `customer_transactions` (service_type, status, refund_status) is the authoritative payment-transaction table, currently only used by the admin panel's first-party `/api/payments/*` routes — neither mobile nor web read/write it directly today (both go through the external call-server).

## Remaining Work

- [x] ~~Decide payment architecture~~ — resolved 2026-08-01: first-party `/api/payments/*` routes built, mirroring the admin panel
- [x] ~~Fix `localStorage`-only booking persistence for doctor appointments and pharmacy orders~~ — resolved 2026-08-01
- [x] ~~Delete dead code: `components/mobile-experience.tsx`~~ — resolved 2026-08-01
- [x] ~~Staffing: replace browse-only "Request staff" with a real booking flow~~ — resolved 2026-08-01
- [x] ~~Instant call: replace basic form with the full mobile state machine (assignment, connecting, cancel, realtime, history)~~ — resolved 2026-08-01 (video/voice join remains blocked, see below)
- [x] ~~Remove hardcoded doctor rating (4.8) and "City pending" fallback text~~ — resolved 2026-08-01
- [ ] Unused exports still in `components/customer-live.tsx` (`CustomerAuthForm`, `CustomerGuard`, 8 unused `Live*Panel` components) — not touched this session, lower priority than functional work
- [x] ~~App shell replacement (kill the sidebar, one shared header for public + portal)~~ — resolved 2026-08-01
- [x] ~~Developer-facing copy cleanup~~ — resolved 2026-08-01 (~23 instances across all screens; a few remain in the unused/dead `Live*Panel` components in `customer-live.tsx`, not fixed since that code isn't rendered by any live route)
- [ ] **Full component library + homepage rebuild + per-page visual redesign** (the rest of Phase 2/4/6 from the latest instructions) — deliberately not attempted this session; the ~2500-line CSS-in-JS `styles` object in `web-app-experience.tsx` still defines every screen's visual structure and was not migrated to the new CSS-class component system. Needs its own dedicated pass.
- [ ] Full responsive verification across 320px–1920px and a real accessibility audit (the new header/drawer were built with accessible patterns but not checked against a formal checklist)
- [ ] Wire booking actions onto lab tests, hospitals, CT/MRI, rental equipment (catalog reads already work) — can now reuse the same `customer_transactions` first-party payment pattern
- [ ] Build ambulance booking, health card wizard, subscription plan purchase from scratch
- [ ] Complete auth: OTP, forgot/reset password, duplicate-account precheck
- [ ] Build net-new modules with no reference implementation anywhere: unified dashboard, unified order history, medical records, per-user notifications, doctor review submission, transaction history, refund status display, CMS FAQs/banners
- [ ] Video/voice consultation + chat — still blocked, since the call-server was only replaced for payments, not Agora video/voice (mobile's video/voice still depends on it; web never had it; instant-call "Join Call" now works up through the `connecting` state and stops there honestly rather than faking a live call)
- [ ] Rotate leaked Supabase DB password (independent, urgent, still outstanding)
- [ ] Commit the `README.md` credential removal
- [ ] Clarify/remove vestigial `pnpm-workspace.yaml` (project is npm-based)
- [ ] Full responsive/accessibility pass (Steps 29–30) — not started; new staffing/instant-call screens reuse existing responsive primitives but were not manually checked at each breakpoint
- [ ] Manual end-to-end Razorpay checkout test with a real logged-in browser session (automated build/lint/typecheck passed, but the live payment round-trip has not been manually clicked through)
- [ ] Manual end-to-end staffing request and instant-call request test with a real logged-in browser session (same caveat — automated checks passed, live click-through not done)
- [ ] Refund flow, transaction history page, duplicate-payment idempotency review — not built this pass
- [ ] Decide whether staffing should eventually be added to `customer_transactions.service_type` / the admin payment `ENTITY_TABLE_MAP` for online prepayment — that's an admin-panel schema/code change, out of scope here; current web behavior deliberately mirrors the admin's existing request-first model instead of inventing a new payment path

## External Blockers

1. **Video/voice consultation still depends on the external call-server.** Payments were successfully migrated off it, but Agora video/voice room + VoIP token registration were not (out of scope for the P0 fix). The instant-call web flow now correctly reaches the "connecting" state and tells the customer live calling is available in the mobile app — it does not fake an in-progress call. Exact remaining action: stakeholder must either grant access to the call-server's Agora integration details, or approve a first-party Agora integration for web (mirroring the admin panel's `NEXT_PUBLIC_AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` setup) when that module is prioritized.
2. **Supabase DB credential rotation**. Implementation status: exposure removed from the working copy of `README.md` (not committed). Exact remaining action: whoever administers the Supabase project must rotate the Postgres password; this cannot be done from within the codebase.
3. **Manual payment smoke test**. The first-party Razorpay integration passed typecheck/lint/build and rejects unauthenticated requests correctly, but has not been exercised end-to-end with a real browser session and a live Razorpay test-mode card. Exact remaining action: someone with a logged-in test account should click through a doctor booking or pharmacy checkout to confirm the full redirect round-trip.
4. **Manual staffing/instant-call smoke test**. Same caveat as above — both flows passed automated checks but need a real logged-in click-through; instant-call assignment additionally needs an online test doctor account to verify the admin-assignment side end-to-end.
