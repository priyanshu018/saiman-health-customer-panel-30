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
| Ambulance, health card, subscription plans, medical records, unified dashboard/history, notifications, CMS FAQs/banners | **Not touched this session** | **Not touched this session** | Unchanged from parity audit | Unchanged | Unchanged |

### Phase 3 completion matrix — lab tests, CT/MRI, hospitals, rental equipment

| Module | Browse | Detail | Booking | Payment | Persistence | History | Realtime | UI | Responsive | Verified |
|---|---|---|---|---|---|---|---|---|---|---|
| Lab Tests | ✅ existing | ✅ new (`/lab-tests/[id]`) | ✅ new (collection type, date, time, notes) | ✅ server-priced from `lab_test_approvals.price`, Razorpay-verified | ✅ `lab_test_bookings` + `lab_test_booking_items`, idempotent fulfill | ✅ new (`/lab-tests/bookings`) | ❌ not built (snapshot on load) | Reuses existing tokens/primitives, no new component library | Not independently verified across breakpoints | tsc/lint/build clean; curl 200; live click-through not tested |
| CT/MRI | ✅ existing | ✅ new (`/ct-mri/[id]`) | ✅ new (date, time, notes) | ✅ server-priced from `ctmri_service_approvals.price` | ✅ `ctmri_service_bookings`, idempotent fulfill | ✅ new (`/ct-mri/bookings`) | ❌ not built | Same as above | Not independently verified | tsc/lint/build clean; curl 200 incl. 404 catalog id; live click-through not tested |
| Hospitals & Surgeries | ✅ existing | ✅ new (`/hospitals/[id]`) | ✅ new — labeled "Request consultation," not "Instant booking" | ✅ server-priced from `hospital_service_approvals.price` | ✅ `hospital_service_bookings`, idempotent fulfill | ✅ new (`/hospitals/requests`) | ❌ not built | Same as above | Not independently verified | tsc/lint/build clean; curl 200; live click-through not tested |
| Rental Equipment | ✅ existing | ✅ new (`/rental-equipment/[id]`) | ✅ new (plan, delivery address/date) | ✅ server-priced from `rental_equipment_approvals` (price/weekly/monthly/deposit) | ✅ `rental_orders`, idempotent fulfill | ✅ new (`/rental-equipment/orders`) with Cancel + Request Return actions | ❌ not built | Same as above | Not independently verified | tsc/lint/build clean; curl 200; live click-through not tested |

Uploads column intentionally omitted from the matrix above — no module in this phase implemented file uploads (see "Explicitly out of scope" in the session log entry).

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

### 2026-08-01 — Phase 3: transactional booking for lab tests, CT/MRI, hospitals, rental equipment

- **Module**: Lab Tests, CT/MRI & Diagnostic Imaging, Hospitals & Surgeries, Rental Medical Equipment — all four taken from browse-only to complete discovery→booking→payment→durable-record→history flows.
- **Reference implementations inspected before writing code**: `Saiman-Customer/lib/labMarketplace.ts` (`createLabBooking`, `fetchPatientLabBookings`), `Saiman-Customer/lib/providerMarketplace.ts` (`createProviderServiceBooking`, shared by hospital+ctmri), `Saiman-Customer/lib/rentalMarketplace.ts` (`createRentalOrder`, `requestRentalReturn`, `cancelRentalOrder`), `Saiman-Customer/app/rental-equi/checkout.tsx` (pricing formula), `Saiman-Health-Admin-Panel/lib/provider-service-marketplace.ts` (table config), `Saiman-Health-Admin-Panel/lib/staffing-marketplace.ts` (cross-checked payment-status defaults, carried over from the prior session).

#### Shared architecture (built once, used by all four)

Per the instruction to not build four disconnected callback implementations:

- **Server-side authoritative pricing** — `lib/payment-transactions.ts` gained `computeBookingPricing(client, ref)`. `app/api/payments/create-order/route.ts` now accepts an optional `bookingRef: {kind, approvalId, plan?}`; when present, it **re-reads the price from the admin-approved catalog row server-side and ignores whatever `amount` the browser sent**, before the Razorpay order is created. This only activates when `bookingRef` is present, so `doctor_consultation`/`pharmacy_order` (which don't send it) are byte-for-byte unchanged — the existing P0 architecture was not modified, only extended. The computed price breakdown (`itemPrice`/`deliveryFee`/`securityDeposit`) is stored in `customer_transactions.metadata.pricingBreakdown` at order-creation time so fulfillment reads back the exact numbers that were actually charged, rather than recomputing (avoiding a race if catalog prices change between order creation and payment completion).
- **Idempotent server-side fulfillment** — new route `app/api/service-bookings/fulfill/route.ts`. One generic handler for all four service types (`lab_booking`, `hospital_booking`, `ctmri_booking`, `rental_order`): authenticates the user, loads the transaction via the service-role client, verifies ownership (`transaction.patient_id === user.id`) and that `status === 'paid'`, then **checks `transaction.entity_id` first** — if already set, returns the existing booking instead of creating a duplicate (this is what makes a payment-callback refresh, browser crash, or double-submit safe: calling fulfill twice for the same transaction is a no-op the second time). Only when unfulfilled does it insert the booking row (+ items for lab) using the transaction's server-verified amount, then links the transaction to the new entity. This is strictly more robust against duplicate-creation than the doctor/pharmacy pattern from the P0 session (which creates the booking client-side) — doctor/pharmacy were deliberately left as-is per "do not rewrite the completed architecture," but any future hardening pass could migrate them to this same fulfill endpoint.
- **Client plumbing** — `lib/web-payments.ts` gained 4 new `PendingPayment` kinds (`lab_booking`, `hospital_booking`, `ctmri_booking`, `rental_order`) and `fulfillServiceBooking()`. `PaymentCallbackInner` in `components/web-app-experience.tsx` now branches to `fulfillServiceBooking()` for these four kinds instead of a bespoke per-module client-side insert.
- **Status display** — `formatBookingStatus()` added to `lib/customer-web-live.ts`: generic title-case + de-underscore transform, so real backend values (`sample_collected`, `return_requested`, etc.) never reach the UI as raw snake_case.

#### Module 1 — Lab Tests
- Routes added: `app/lab-tests/[id]/page.tsx` (detail + booking form), `app/lab-tests/bookings/page.tsx` (history)
- Components added: `WebLabTestDetailScreen`, `WebLabBookingsScreen`
- Backend: `lab_test_bookings` (insert: `patient_id, lab_id, lab_name, lab_address, city, status:'placed', payment_method:'pay_online', payment_status:'paid', home_collection, report_time, subtotal, total, notes`), `lab_test_booking_items` (one row per booking — see scoping note below)
- Flow: browse → pick home collection or center visit, date, time, notes → pay (server-priced from `lab_test_approvals.price`) → `lab_test_bookings` row created server-side on verified payment → appears in `/lab-tests/bookings` with live status
- **Scoping note**: booking is single-test (one test per checkout), not mobile's multi-test cart (`groupLabOffers`). This is a complete, real, correctly-persisted transaction — just one test per order rather than a bundled cart. Date/time/collection-address are stored as JSON inside the `notes` column, matching the **existing production schema's own convention** (mobile does the same — `lab_test_bookings` has no dedicated slot columns).
- CTA copy fixed: "Book soon" → "Book test" (spec explicitly required this).

#### Module 2 — CT/MRI & Diagnostic Imaging
- Routes added: `app/ct-mri/[id]/page.tsx`, `app/ct-mri/bookings/page.tsx`
- Components added: `WebCtmriDetailScreen`, `WebCtmriBookingsScreen`
- Backend: `ctmri_service_bookings` (insert: `patient_id, provider_id, approval_id, service_name, appointment_date, appointment_time, amount, payment_status:'paid', status:'requested', notes`)
- Flow: browse → pick date/time, add notes → pay (server-priced from `ctmri_service_approvals.price`) → row created server-side → appears in `/ct-mri/bookings`
- No-service empty state: when a detail page 404s (removed/unapproved listing), shows a real empty state with "Browse Imaging Centers" and "Contact Support" actions, not a blank page.
- CTA copy fixed: "Same-day slots" (an unverifiable claim) → "Book scan".
- **No report-access screen was built** — confirmed no report table/storage flow exists for CT/MRI in either mobile or admin (this was already flagged as a genuine gap in the original parity audit, not something introduced this session).

#### Module 3 — Hospitals & Surgeries
- Routes added: `app/hospitals/[id]/page.tsx`, `app/hospitals/requests/page.tsx`
- Components added: `WebHospitalDetailScreen`, `WebHospitalRequestsScreen`
- Backend: `hospital_service_bookings` (same shape as ctmri — shared `hospitalServiceBookingTable`/`ctmriServiceBookingTable` config on the admin side, per `provider-service-marketplace.ts`)
- **CTA language audit**: real backend status starts at `'requested'`, not a confirmed booking — admin/hospital reviews before it becomes `'confirmed'`. **"Instant booking" (previously shown on every tile) has been replaced with "Request consultation"**, and the detail page explicitly tells the customer "This submits a consultation request — the hospital confirms your exact appointment slot after review," matching the real workflow instead of overclaiming.
- Payment happens at request time (matches `customer_transactions.service_type` including `hospital_booking` and mobile's own `createProviderServiceBooking` calling `launchVerifiedPayment` first) — this is the real, existing product model, not a new invention.

#### Module 4 — Rental Medical Equipment
- Routes added: `app/rental-equipment/[id]/page.tsx`, `app/rental-equipment/orders/page.tsx`
- Components added: `WebRentalEquipmentDetailScreen`, `WebRentalOrdersScreen` (includes Cancel and Request Return actions, matching mobile's `cancelRentalOrder`/`requestRentalReturn`)
- Backend: `rental_orders` (insert: `patient_id, provider_id, equipment_id, equipment_name, equipment_image_url, provider_name, plan, rental_days, unit_price, delivery_fee, security_deposit, total, status:'placed', payment_method:'upi', payment_status:'paid', delivery_address, delivery_date, delivery_time_slot`)
- Pricing formula mirrors mobile's actual `checkout.tsx` exactly: the selected plan's catalog price *is* the full rental-period price (not multiplied by day count — that's genuinely how mobile does it, confirmed by reading its checkout screen, not an assumption), plus a flat ₹40 delivery fee (same flat value mobile hardcodes) plus the refundable security deposit.
- Extended `RentalEquipmentSummary` (`lib/customer-web-live.ts`) with `providerId` — the browse listing was previously missing the provider's user id (`rental_equipment_approvals.submitted_by_id`), which is required to create a valid order; without this fix, booking would have been impossible regardless of UI work.
- **Scoping note — commission fee omitted**: mobile's rental checkout also adds a `provider_commission_settings`-derived platform commission line to the total. This session's implementation does not add that line item — the total charged is item price + delivery fee + deposit only. This is a deliberate, documented simplification (the commission is an internal admin/provider revenue-split concern, not something that blocks a valid, complete, correctly-persisted customer transaction), not a shortcut on data integrity.

#### Explicitly out of scope this session (documented, not silently dropped)
- **File uploads** (prescriptions, previous reports, referral letters) — none of the four modules got upload UI. Building a secure, ownership-checked, signed-URL upload pipeline from scratch is substantial standalone work; none of the four bookings *require* a document to be created correctly, so this was deferred rather than attempted shallowly.
- **Realtime status updates** — none of the four modules subscribe to `postgres_changes` on their booking tables (staffing and instant-call, from the prior session, still do). History pages show a snapshot on load; a manual refresh is needed to see admin-side status changes. Noted as a fast-follow, not a fake "realtime" label.
- **Full responsive (320px–1920px) and accessibility verification** — the four modules reuse the same responsive section/form primitives already used by staffing (which itself was flagged as "not independently verified"), so the same caveat applies here.
- **Duplicate-payment idempotency for doctor/pharmacy** — not touched, per the explicit instruction not to modify the completed P0 architecture. The new fulfill-endpoint pattern used by these four modules is strictly more robust; retrofitting doctor/pharmacy to it is a reasonable future task, not done here.

#### Testing performed
- `npx tsc --noEmit`: clean after every module (checked incrementally, not just once at the end)
- `npm run lint`: clean
- `npm run build`: succeeds — 39 routes total, including the 8 new detail/history routes and the new `/api/service-bookings/fulfill` dynamic route
- Manual `curl` smoke test: all 16 pre-existing + new routes return 200; all 4 new dynamic detail routes return 200 even with a nonexistent UUID (renders the "not found" empty state rather than crashing)
- Manual `curl` against `/api/service-bookings/fulfill` with no auth header: correctly rejected with `401`-style JSON error (auth guard confirmed working)
- **Not tested**: an actual end-to-end booking with a real logged-in session and a live Razorpay test-mode payment, for any of the four modules — same caveat as every payment-related change in this project so far. Admin-side visibility (does the new booking actually show up correctly in the admin panel's lab/ctmri/hospital/rental dashboards) was verified by matching the exact column names/values those dashboards already read (per the admin-panel tracing above), not by opening the admin panel and looking.

### 2026-08-01 — Phase 4: production UI/UX polish pass

- **Scope**: visual/UX refinement only — no backend, payment, booking-logic, database-schema, or API changes. Confirmed via full regression smoke test at the end (all 39 routes, all four payment flows' route structure unchanged).
- **Approach taken**: rather than hand-editing ~30 screen components individually, the highest-leverage lever available in this codebase's architecture was upgraded — the ~340-key shared `styles` object in `components/web-app-experience.tsx` that every `DashboardFrame`-wrapped screen already draws from. Elevating the shared **definitions** (not the ~30 call sites) cascades the improvement to every page that uses them simultaneously. This is the same lever used for the Phase 2 token work, applied one level deeper (component styles, not just color variables).

#### Shared style system upgrade (cascades to all ~30 screens)
- **Cards** (`infoTileCard`, `appointmentCard`, `doctorCard`, `statCard`, `sectionBlock`): moved from ad-hoc pixel radii (`10px`, `12px`, `14px`) to the `--radius-md`/`--radius-lg` tokens from Phase 2, added a consistent `--shadow-card`, increased padding for breathing room, added `transition` for the new hover interaction (below).
- **New CSS utility** — `.hover-lift` in `app/globals.css`: subtle lift + shadow on hover/focus-visible, respects `prefers-reduced-motion`. Applied via `className` (mechanical, verified-consistent find/replace) to all 16 existing `infoTileCard`/`appointmentCard`/`doctorCard` usages plus the 2 new dashboard card types — cards no longer feel like static database rows.
- **Buttons/pills** (`primaryAction`, `primaryActionLink`, `secondaryActionLink`, `filterChip`): moved to pill radius, added shadow depth on the primary action, added active-state elevation on filter chips (was a flat tint swap before).
- **`heroWideCard`** (the single most-repeated element in the app — used on nearly every module page: doctors, pharmacy, lab, CT/MRI, hospitals, rental, care-staff, ambulance, subscription): replaced the flat two-stop diagonal gradient with a layered radial-highlight + richer gradient (`themeStyles.wideCardGradient`), larger radius, `--shadow-brand`. **Deliberately kept dark** rather than flipped to a light card — the shared `heroCopy`/`bluePill`/`secondaryActionLink` child styles are reused by ~10 different pages with hardcoded white/translucent-white treatments; flipping the background to light without auditing every one of those reuse sites risked invisible-text regressions I could not fully verify in the time available. The complaint about "repeated blue gradient blocks" is real and only partially addressed — see remaining UI debt.
- **Typography scale**: `pageTitle`/`sectionTitle`/`heroHeadingAlt`/`statValue` moved to `clamp()`-based fluid sizing tied to the Phase 2 type scale, tighter/more intentional letter-spacing. Found and fixed a genuine bug in `tileTitle` — `letterSpacing: "-0.04em"` was so tight it likely read as visually broken on longer titles; corrected to `-0.02em`, consistent with every other heading.
- **Spacing rhythm**: `mainScroll`/`mainInner`/`mainContent` padding and gaps increased (22px→32px page padding, 16px→22–26px section gaps) for better desktop density without feeling cramped; `mainInner` max-width increased 1180→1240px.
- **Empty states** (`emptyPanel`): switched from a flat bordered box to a dashed-border invitation pattern with more generous padding — reads as "nothing here yet, here's what to do" rather than an error-adjacent box.
- **Tabs** (`tabRow`/`tabButton`): converted from individually-bordered buttons to a single pill-shaped segmented control (matches the "Upcoming/Completed/Cancelled" pattern used on Appointments and elsewhere) — this is the pattern used by every reference product named in the brief (Practo, Apollo, etc.), not a copy of their UI, just the same well-established control shape.
- **Fixed a real layout bug found during this pass**: `summaryPanel`'s `position: sticky; top: 20` was written before the app had a sticky header (Phase 2). With the header now permanently present, a sticky summary at `top: 20` would tuck under the header on scroll. Corrected to `top: 100`.

#### Payment confirmation experience (explicitly called out as "feels unfinished")
- `PaymentCallbackInner` (`/payment-callback`) rebuilt from a single static "Payment Callback" heading + plain text into a real three-phase experience: **verifying** (pulsing icon), **success** (green check-circle, "Booking confirmed", auto-redirect after a beat so the confirmation actually registers instead of instant-redirecting), **error** (red icon, the actual error message, plus Contact Support and Go Home actions — previously an error just left the customer on a page with no way forward).
- New shared style keys: `confirmationPanel`, `confirmationIcon` (+ success/error variants), `confirmationTitle`, `confirmationCopy` — centered circular icon badge pattern, matching the "success illustration" ask (icon-based, not a custom SVG illustration — see remaining UI debt).

#### Dashboard (`WebHomeScreen`)
- **Found and fixed a real bug, not a style issue**: `WebHomeScreen` — the fully-built "command center" dashboard with live appointment/order counts — was **never rendered by any route**. `app/page.tsx` unconditionally rendered the public marketing page (`CustomerLandingPage`) regardless of login state, and nothing else imported `WebHomeScreen` anywhere in the app. The portal sub-navigation added in Phase 2 already links "Dashboard" to `/`, which only worked by accident (landing on the marketing page). Fixed: `app/page.tsx` now checks auth state client-side and renders `WebHomeScreen` for logged-in customers, `CustomerLandingPage` for everyone else — the same pattern used by every reference product in the brief (marketing site when logged out, dashboard at the same URL when logged in).
- Removed a **fabricated promotional claim** — the dashboard hero previously read "20% off lab tests," a discount that doesn't exist anywhere in the backend or CMS. Replaced with real, unembellished copy.
- Removed a **fabricated status** — the stats row showed "Health card: Active" unconditionally, even though the health-card module is still a static stub with no real application data (§12 of the parity audit). Replaced with a real, live-queried "Open support tickets" count.
- Replaced 9 identical "✚" service icons (explicitly called out as weak visual identity) with distinct emoji per service (🩺 💊 🧪 🩻 🚑 🦽 🏥 🪪 🧑‍⚕️) — inexpensive but real per-service visual differentiation given no illustration asset pipeline exists.
- The decorative "search module" (static text, no input) is now a real functional search form that routes to `/doctors?q=...`, matching the header search added in Phase 2.

#### Explicitly not done this session (documented, not silently skipped)
- **Unique bespoke hero layout per service** (12 distinct heroes with illustration, as literally requested) — not built. All module heroes still share the single upgraded `heroWideCard` treatment; differentiation is currently limited to copy, icon, and accent pill text, not distinct layouts or illustrations.
- **Profile page feature depth** (Family, Documents, Saved Providers, Payment History, Security, Notifications sections) — **not built**. These are new features with no backing data or existing reference implementation on mobile or admin, not a visual-polish task; building them would mean inventing UI with nothing behind it, which contradicts "never invent... only display real information."
- **Full responsive verification across all 8 breakpoints** — not independently re-verified this session (same caveat carried from Phase 2/3). The spacing/radius/shadow changes use the same responsive primitives already in place, so no new breakage is expected, but this wasn't checked pixel-by-pixel.
- **Formal accessibility audit** — the new `.hover-lift` utility includes `:focus-visible` and `prefers-reduced-motion` handling, and the confirmation page announces state via visible text (not color alone), but a full audit (contrast ratios measured, screen-reader pass, keyboard-only pass) was not performed.
- **Performance review** (bundle size, CLS, hydration, memoization, image optimization) — not performed this session; no evidence of new regressions from purely additive style/class changes, but not independently measured.
- **The "repeated blue gradient banner" complaint is only partially resolved** — `heroWideCard` itself is richer and more premium, but it is still the same dark panel reused on ~10 pages, for the contrast-safety reason explained above. Fully resolving this requires auditing every page's use of `heroCopy`/`bluePill`/`secondaryActionLink` to confirm safe contrast on a lighter background, which needs its own pass.

#### Testing performed
- `npx tsc --noEmit`: clean (checked after each major edit group, not just once at the end)
- `npm run lint`: clean
- `npm run build`: succeeds, all 39 routes unchanged in structure
- Manual `curl` regression sweep: 26+ routes across every module return 200, including the now-conditionally-rendered `/`
- Verified `hover-lift` class is present in the compiled component source (18 occurrences) and confirmed via build output that no route was added, removed, or restructured
- **Not tested**: actual visual appearance in a browser (no visual/screenshot review was performed — verification here is limited to "does it build and route correctly," not "does it look premium"), and the authenticated dashboard render path (`WebHomeScreen` via `/`) was not exercised with a real logged-in session

### 2026-08-02 — Phase 5: browser-based visual QA + bug fixes

Closes the "not tested in a browser" gap called out at the end of the previous entry. Ran the dev server, drove it with Playwright (Chromium) at desktop 1440×900 and mobile 390×844 across all 32 routes plus 5 detail-page types (doctor, lab test, hospital, CT/MRI, rental equipment), inspected each screenshot, and fixed every real defect found. Re-screenshotted after each fix to confirm the render, not just that the build passed. This was a bug-fix and consistency pass, not a redesign — no new pages, routes, or features were added.

**Genuine bugs found and fixed (not style preference — each had a concrete failure mode):**
- **`react-hooks/set-state-in-effect` lint error** in the newly-rewritten `WebRecordsScreen` — `setLoading(false)` was called synchronously inside the effect body on the `!user` branch. Fixed using the established pattern: derive `loading` from `authState.loading || (Boolean(user) && dataLoading)` instead of setting state directly.
- **Currency formatting bug**: `formatMoney()` used `maximumFractionDigits: 2` with no minimum, so DB prices with cents (e.g. `674.1`, `1789.3`) rendered as ragged single-decimal amounts ("₹674.1", "₹1,789.3") instead of proper currency ("₹674.10", "₹1,789.30"). Whole-rupee prices are unaffected (still "₹70", not "₹70.00"). Single shared function, fixes every price on the site.
- **White-on-white empty-state CTA** — `primaryActionLink` (a white pill button, `background: themeStyles.panel` = `#ffffff`) was reused on all 12 `emptyPanel` empty-state cards, which also have a white/`var(--surface-strong)` background. The button was only ever meant for use on the dark/gradient hero cards (where it correctly contrasts) — on empty states it rendered as a barely-visible white-on-white button with a faint shadow. Added a new `emptyPanelAction` style (filled brand-gradient pill, matching `primaryAction`) and swapped it in at all 12 sites (appointments, lab bookings ×2, hospital requests ×2, CT/MRI bookings ×2, rental orders ×2, care staff requests, pharmacy cart, pharmacy home empty-search).
- **Infinite "Loading..." spinner for logged-out visitors** on 5 screens (`LabBookingsInner`, `HospitalRequestsInner`, `CtmriBookingsInner`, `RentalOrdersInner`, `StaffingBookingsInner`): each effect had `if (!user) return;` as its first line, but `loading` was local `useState(true)` state only ever resolved to `false` inside the fetch chain that never ran for a logged-out user — so any visitor who wasn't logged in got stuck on "Loading your requests..." forever, with no empty state and no login prompt. Confirmed by screenshot (Hospital Requests page hung indefinitely). Fixed with the same `authState.loading`-derived pattern as the lint fix above, applied to all 5.
- **Fixed-column CSS grids breaking on mobile** — React inline `style` objects can't contain media queries, so any screen using a hardcoded `gridTemplateColumns: "repeat(N, ...)"` stayed at N columns at every viewport width, including 390px mobile. Found via screenshot (Records metrics row and Subscription Plans page both showed clipped/overlapping text on mobile) and then proactively grepped for the same pattern across the whole file — found and fixed 8 more instances: `statRow` (homepage, 4-col), `doctorGrid` (2-col, 2 usages incl. skeleton), `dualPromoGrid` (2-col), `infoStatGrid` (2-col, 5 usages), `specialtyGrid` (3-col), `planCardGrid` (3-col, 2 usages — Subscription Plans was unreadable on mobile before this fix), `topicGrid` (3-col), `orderGrid` (3-col, pharmacy orders). Added shared `.responsive-grid-metrics` / `.responsive-grid-2col` / `.responsive-grid-3col` CSS classes with real breakpoints (640px, 900px) to `globals.css`, following the same pattern already established for `.responsive-grid-sidebar/detail/standard` in the Phase 4 session.
- **Doctor profile card content overlap on mobile** — `profileCard` used a fixed 3-column grid (`144px avatar | 1fr info | 128px price`) that doesn't fit in a 390px viewport; the doctor name, verified badge, and price badge visibly overlapped each other (confirmed by screenshot on `/doctors/[id]`). Added `.responsive-profile-card` (single column below 640px, restores the 3-column layout above it) — this is the same booking page every doctor consultation funnel routes through, so this was a real conversion-blocking bug on mobile, not cosmetic.
- **Misleading fallback text**: `hospital: text(row.hospital, "Online consultation")` — when a doctor record has no hospital set, the field rendered a "Hospital" label with the value "Online consultation," which reads as nonsense (a consultation-mode string under a hospital-name label). Confirmed on the seeded test doctor. Changed the fallback to "Hospital not specified," matching the existing honest-fallback convention already used for `city` ("Location not specified") elsewhere in the same file. Also fixed the related `formatAvailability()` fallback from the tautological `["Consultation"]` (renders as "Consultation Mode: Consultation") to `["Contact for availability"]`.

**Verification**: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds (all 39 routes unchanged in structure) — checked after every fix, not just once at the end. Full Playwright sweep (32 routes × 2 viewports = 62 combinations, plus 5 detail-page types × 2 viewports) confirmed 0 unexpected console errors after the final round of fixes (the one `consoleErrors=1` on `not-found` is the branded 404 page's own expected HTTP 404 status, not a real error).

**Not done this session** (same category of gap as prior sessions, called out explicitly rather than silently skipped):
- No new features, routes, or booking flows were added — this was scoped as a bug-fix/consistency pass per explicit instruction.
- Doctor specialty chip data quality (`"Cardiologist"` vs `"Cardiology"` showing as separate filter chips, one doctor's specialty literally reading `"pawankhokhar"`) is a seed-data/admin-entry issue, not a frontend bug — not touched.
- No manual end-to-end Razorpay click-through was performed this session (same caveat carried from every prior phase — automated checks pass, live payment round-trip needs a human with a real logged-in session and a test card).
- Full formal accessibility audit (contrast ratios, screen reader, keyboard-only) still not performed — carried forward from Phase 4.

### 2026-08-02 — Final Phase: production-readiness engineering audit

Full-repo engineering audit (auth, security, API routes, error handling, performance, Next.js best practices, accessibility, code quality) requested as the final pass before client delivery, scoped explicitly as *no redesign, no new features, no changed workflows — engineering hardening only*. Ran four parallel read-only research passes (security/API routes, error-handling/code-quality, Next.js/performance, accessibility) to build a concrete finding list, then fixed everything that was a genuine defect rather than a preference. See the final chat response in this session for the full scored report (production readiness score, security/performance/accessibility/code-quality findings, launch blockers, final recommendation).

#### Security fixes (all in `app/api/payments/*`, `app/api/service-bookings/fulfill`, `lib/payment-transactions.ts`, `lib/web-payments.ts`)

- **Price tampering (critical)**: `create-order` only re-derived price server-side (via `computeBookingPricing`) for lab/ctmri/hospital/rental bookings — `doctor_consultation` and `pharmacy_order` still trusted a client-sent `amount`, so a direct API call could book a real doctor consultation or pharmacy order for ₹1. Fixed by extending `BookingRef`/`computeBookingPricing` to cover doctors (re-fetches `users.fee`, applies the same single/monthly/yearly multiplier as the UI) and pharmacy orders (re-fetches each `pharmacy_product_approvals.price` by product id and re-sums), and by making `create-order` **reject** any request for a priced service type that arrives without a `bookingRef` — closing the bypass-the-client path, not just fixing the two call sites.
- **Unauthenticated PII leak + open redirect (critical)**: `GET /api/payments/checkout` rendered a transaction's customer name/email/phone/amount to anyone who supplied a `transactionId` — no auth check existed at all — and reflected an unvalidated `redirectUri` into a client-side `window.location.replace`. Fixed by having `create-order` mint the bearer token into the checkout URL as a one-time query param (the checkout page is a plain top-level navigation, which can't carry an `Authorization` header), and `checkout` now re-validates that token against the transaction's `patient_id` before rendering anything, plus both routes now require `redirectUri` to be same-origin.
- **Cross-account payment funding (medium)**: `verify` and `link-booking` authenticated the caller but never checked the transaction actually belonged to them — any logged-in user could verify or re-link *another customer's* transaction by ID. Both routes now fetch the transaction first and reject with 403 if `patient_id !== user.id`.
- **Paid-for-X, fulfilled-as-Y (medium)**: `fulfill` wrote `approval_id`/`equipment_id` straight from the client-submitted booking payload for hospital/ctmri/rental bookings, completely independent of the `approvalId` that was actually priced at `create-order` time — a customer could price a cheap service, then fulfill a booking row for an expensive one at the cheap price with `payment_status: "paid"`. Fixed by comparing the submitted `approvalId`/`equipmentId` against the transaction's own stored `bookingRef.approvalId` and rejecting on mismatch. **Not fixed**: the equivalent check for `lab_booking` — its booking payload has no field that maps back to `bookingRef.approvalId`, so closing this fully would require re-fetching the approval row's canonical test name/lab at fulfill time; flagged as remaining work rather than guessed at.
- **Defense-in-depth**: `requestRentalReturn`/`cancelRentalOrder` (`lib/customer-web-live.ts`) updated `rental_orders` by id only, relying entirely on RLS (unverifiable from this repo) for ownership — added an explicit `.eq("patient_id", ...)` filter at the app layer too.

#### Error handling

- **11 unhandled promise rejections** — every `fetchApproved*()` catalog effect across doctors/lab-tests/hospitals/ct-mri/rental/care-staff (list + detail screens) chained `.then().finally()` with no `.catch()`, so a fetch failure logged an uncaught rejection and silently rendered as an indistinguishable "no results" empty state. Added `.catch(() => setLoadError(true))` to all 11 and a distinct "Unable to load — please refresh" message shown only when the failure was a real error, not a genuinely empty catalog.
- **8 `alert()` calls** replaced with the existing inline `errorNote`/notice-card pattern already used elsewhere in the app (doctor booking, pharmacy checkout, rental return/cancel, header logout). One `alert()` was deliberately left — `useAuthActionGuard`'s "Supabase env not configured" guard, which only fires when the whole app is misconfigured at the infrastructure level, not during normal use.
- **No error boundary anywhere** — confirmed zero `error.tsx`/`global-error.tsx` in the repo; any unhandled render exception fell through to Next.js's generic unstyled error page. Added `app/error.tsx` (route-level, branded, matches the existing confirmation-panel visual language, has a working "Try Again") and `app/global-error.tsx` (last-resort root-layout fallback, deliberately self-contained/inline-styled since it replaces `<html>`/`<body>` and can't assume `globals.css` or other components still work).

#### Code quality / dead code removed

- `components/customer-live.tsx` (1078 lines) — deleted ~900 lines of confirmed-dead code (`CustomerGuard`, `CustomerShellAuthActions`, `CustomerAuthForm`, and 7 `Live*Panel` components), keeping only `useCustomerUser`, which is the only export anything else in the repo actually imports. Verified zero references anywhere before deleting.
- `WebSupportScreen` (`components/web-app-experience.tsx`) — deleted; `/support` has always rendered `CustomerSupportHubPage` from `customer-site-pages.tsx` instead, leaving this ~135-line duplicate fully orphaned.
- `lib/customer-web-data.ts` — trimmed from 126 lines to 5; removed 9 of its 11 exports (`primaryNav`, `heroStats`, `featuredDoctors`, `featuredPharmacy`, `featuredTests`, `featuredHospitals`, `appointmentTimeline`, `healthPrograms`, and — once `WebSupportScreen` was gone — `supportTopics` too), keeping only `subscriptionPlans`, the one export still genuinely imported anywhere.
- Removed the now-unused imports (`createSupportTicket`, `SupportTicketSummary`, `supportTopics`) that were only referenced by the deleted `WebSupportScreen`.

#### Next.js best practices / performance

- **Metadata**: every route previously inherited the exact same title/description from the root layout — added a real per-route `export const metadata` (title + description) to all 35 static `page.tsx` files and `not-found.tsx`. The one route that couldn't get one is `app/page.tsx` (`/`), which is a client component (it branches between the marketing page and dashboard based on auth state) — client components can't export `metadata`; it keeps the root layout's default. Per-entity dynamic metadata for detail pages (`doctors/[id]` using the doctor's real name, etc.) was **not** added — doing it safely means a server-side fetch inside `generateMetadata`, which is a larger, riskier change than this pass's scope; flagged as follow-up.
- **SEO files**: added `app/robots.ts` (allows public marketing/discovery routes, disallows authenticated account/booking/checkout screens and `/auth/`) and `app/sitemap.ts` (lists the 16 stable public routes; dynamic per-entity URLs not included — see above). Both read `NEXT_PUBLIC_SITE_URL` (already provisioned in `.env.example`, previously unused) with a placeholder fallback.
- **Memoization**: wrapped 8 previously-unmemoized search/filter/derived-list computations in `useMemo` (doctors specialty map + filter, pharmacy categories + filter, lab tests/hospitals/ct-mri/rental/care-staff filters, appointments status grouping) — these were recomputing on every keystroke and every unrelated re-render.
- **Not done**: splitting the single 4924-line `"use client"` `web-app-experience.tsx` module (31 screens, one bundle regardless of route) into per-route files for real code-splitting — this is a moderate refactor, not a targeted fix, and was left as documented technical debt rather than risked under this pass's "no redesign" constraint.

#### Accessibility

- Added `aria-label` to 8 previously placeholder-only search inputs (doctors, pharmacy, lab-tests, hospitals, ct-mri, rental-equipment, care-staff, home hero search) and to the pharmacy quantity +/− buttons and cart remove button (previously bare "−"/"+"/"Remove" with no accessible name beyond the visible glyph).
- Added `htmlFor`/`id` pairing to the login/signup form fields (previously sibling `<label>`/`<input>` with no programmatic association anywhere in the file) — scoped to this one form (the primary conversion funnel) rather than all ~9 booking forms in the app, to keep this pass's risk bounded; the other forms are documented as remaining work.
- Fixed invalid interactive-in-interactive markup on the care-staff type-selector tiles (`<span role="button">` nested inside a `<button>`, which is invalid HTML and breaks the accessibility tree) — the outer tile is now a `<div role="button" tabIndex={0}>` with a manual `onKeyDown` (Enter/Space), and the inner +/− controls are now real `<button>` elements with `aria-label`s.
- Increased `quantityButton`/`removeButton` tap targets to the 44px guideline minimum (previously unstyled/no minimum, well under 44px on mobile).
- **Not done**: full contrast audit (found `#94a3b8` used for meaningful text — mobile drawer section labels, struck-through MRP prices — computing to ~2.56:1, below AA; not changed since it's a design-token-level decision, not a bug fix, and out of scope for "no redesign"), focus-trap/focus-return for the header's dropdown menus and mobile drawer, and htmlFor/id pairing for the other ~9 booking forms.

#### Verification

`npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` succeeds (all 41 routes, including the two new `/robots.txt` and `/sitemap.xml` routes) — checked after every fix. Full Playwright sweep (32 routes × 2 viewports, plus 5 detail-page types) confirmed 0 unexpected console errors and correct rendering after all changes, including the doctor-detail and pharmacy-cart pages that now send `bookingRef` in their payment payload. **Not verified**: an actual end-to-end Razorpay payment click-through with a real logged-in session and test-mode card — this requires a live browser session with real credentials, which wasn't available in this environment; the security fixes were verified by code inspection, type-checking, and confirming the affected pages still render and typecheck correctly, not by exercising the payment flow live.

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
- [x] ~~`WebHomeScreen` (dashboard) was dead code, never rendered by any route~~ — resolved 2026-08-01: `app/page.tsx` now renders it for logged-in customers, the public landing page otherwise
- [x] ~~Fabricated "20% off lab tests" discount and fake "Health card: Active" status on the dashboard~~ — resolved 2026-08-01
- [ ] Unique per-service hero layouts/illustrations (12 requested, all currently share one upgraded treatment differentiated only by copy/icon)
- [ ] Profile page feature depth (Family, Documents, Saved Providers, Payment History, Security, Notifications) — net-new features, not built
- [ ] Formal accessibility audit (contrast measurement, screen-reader pass, keyboard-only pass) and performance review (bundle size, CLS, hydration) — not performed
- [ ] Resolve remaining dark-gradient repetition on `heroWideCard` across ~10 module pages properly (would require auditing every page's reuse of `heroCopy`/`bluePill`/`secondaryActionLink` for contrast safety before lightening the background)
- [x] ~~Visual/screenshot review in an actual browser~~ — resolved 2026-08-02: full Playwright sweep at desktop + mobile viewports across every route, see Phase 5 entry above
- [x] ~~App shell replacement (kill the sidebar, one shared header for public + portal)~~ — resolved 2026-08-01
- [x] ~~Developer-facing copy cleanup~~ — resolved 2026-08-01 (~23 instances across all screens; a few remain in the unused/dead `Live*Panel` components in `customer-live.tsx`, not fixed since that code isn't rendered by any live route)
- [ ] **Full component library + homepage rebuild + per-page visual redesign** (the rest of Phase 2/4/6 from the latest instructions) — deliberately not attempted this session; the ~2500-line CSS-in-JS `styles` object in `web-app-experience.tsx` still defines every screen's visual structure and was not migrated to the new CSS-class component system. Needs its own dedicated pass.
- [ ] Full responsive verification across 320px–1920px and a real accessibility audit (the new header/drawer were built with accessible patterns but not checked against a formal checklist)
- [x] ~~Wire booking actions onto lab tests, hospitals, CT/MRI, rental equipment~~ — resolved 2026-08-01 (full discovery→payment→persistence→history flow for all four; see Phase 3 completion matrix)
- [ ] Realtime status updates for lab/ctmri/hospital/rental bookings (history pages currently show a load-time snapshot, not live updates)
- [ ] Secure file uploads (prescriptions, previous reports, referral letters) for lab/ctmri/hospital/rental — none of the four modules built this; no booking requires it to be created correctly, but it's part of the real product spec
- [ ] Multi-test lab cart (current lab booking is one test per checkout, not mobile's cart-based multi-test flow)
- [ ] Rental commission-fee line item (mobile adds a `provider_commission_settings`-derived platform fee on top of item+delivery+deposit; web currently omits it — internal revenue-split concern, not a customer-facing correctness issue)
- [ ] Retrofit doctor/pharmacy booking creation onto the new idempotent `/api/service-bookings/fulfill` pattern (currently client-side insert, works but less robust against duplicate-creation-on-refresh than the pattern now used by lab/ctmri/hospital/rental)
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
- [x] ~~Price tampering on doctor/pharmacy checkout, unauthenticated PII leak + open redirect on the checkout page, cross-account verify/link-booking, paid-for-X-fulfilled-as-Y on hospital/ctmri/rental~~ — resolved 2026-08-02, see "Final Phase" entry above
- [ ] Close the same paid-for-X-fulfilled-as-Y gap for `lab_booking` specifically — needs `fulfill` to re-fetch the priced approval row's canonical test identity rather than trusting the client payload, not yet done
- [ ] Per-entity dynamic `generateMetadata` for detail pages (`doctors/[id]`, `hospitals/[id]`, `lab-tests/[id]`, `ct-mri/[id]`, `rental-equipment/[id]`) — static per-route metadata was added everywhere else, but these need a server-side fetch to use the real entity name/description
- [ ] Split `components/web-app-experience.tsx` (4924 lines, 31 screens, all one client bundle) into per-route files so `next/dynamic`/route-level code splitting can actually reduce bundle size — currently every route pulls in the whole module regardless of which screen is rendered
- [ ] Formal color-contrast audit and fix (`#94a3b8` used for meaningful text computes to ~2.56:1, below AA) — flagged, not changed, since it's a design-token decision out of scope for an engineering-only pass
- [ ] Focus-trap and focus-return for the header's dropdown menus (`NavDropdown`, `NotificationsMenu`, `AccountMenu`) and the mobile drawer; the mobile drawer also doesn't close on Escape (only backdrop click) unlike the other three
- [ ] `htmlFor`/`id` label pairing for the ~9 remaining booking forms (doctor booking, instant call, lab/hospital/ctmri/rental/care-staff/support) — done for login/signup only this pass
- [ ] No production error-telemetry/logging pipeline exists — `app/error.tsx`/`app/global-error.tsx` (added this session) only `console.error`; failures are invisible to whoever operates the app in production until a user reports them
- [ ] Manual end-to-end Razorpay click-through specifically re-verifying the new `bookingRef`-based doctor/pharmacy pricing and the new checkout-page auth token flow — the code was verified by type-checking and route inspection, not by clicking through a real payment

## External Blockers

1. **Video/voice consultation still depends on the external call-server.** Payments were successfully migrated off it, but Agora video/voice room + VoIP token registration were not (out of scope for the P0 fix). The instant-call web flow now correctly reaches the "connecting" state and tells the customer live calling is available in the mobile app — it does not fake an in-progress call. Exact remaining action: stakeholder must either grant access to the call-server's Agora integration details, or approve a first-party Agora integration for web (mirroring the admin panel's `NEXT_PUBLIC_AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` setup) when that module is prioritized.
2. **Supabase DB credential rotation**. Implementation status: exposure removed from the working copy of `README.md` (not committed). Exact remaining action: whoever administers the Supabase project must rotate the Postgres password; this cannot be done from within the codebase.
3. **Manual payment smoke test**. The first-party Razorpay integration passed typecheck/lint/build and rejects unauthenticated requests correctly, but has not been exercised end-to-end with a real browser session and a live Razorpay test-mode card. Exact remaining action: someone with a logged-in test account should click through a doctor booking or pharmacy checkout to confirm the full redirect round-trip.
4. **Manual staffing/instant-call smoke test**. Same caveat as above — both flows passed automated checks but need a real logged-in click-through; instant-call assignment additionally needs an online test doctor account to verify the admin-assignment side end-to-end.
5. **Manual lab/CT-MRI/hospital/rental smoke test**. Same caveat again — all four new booking flows pass automated checks and correctly reject unauthenticated fulfillment requests, but need a real logged-in click-through with a live Razorpay test-mode payment to confirm the full create-order → checkout → verify → fulfill round-trip end-to-end, and to visually confirm the resulting rows appear correctly in the admin panel's lab/ctmri/hospital/rental dashboards (verified by column-matching during development, not by opening the admin panel).
