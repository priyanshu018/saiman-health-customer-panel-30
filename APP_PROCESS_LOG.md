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

## Backend Reference

See `CUSTOMER_WEB_PARITY_AUDIT.md` §1–§22 for the full, grouped-by-module inventory of tables, RPCs, storage buckets, realtime channels, and verbatim status-enum values (ground truth extracted from the admin panel's SQL migrations and code). Key points:
- Status enum casing is **inconsistent per table** (e.g. `staffing_bookings` and `support_tickets` use Title Case, most others use lower_snake_case) — do not assume a single vocabulary.
- `customer_transactions` (service_type, status, refund_status) is the authoritative payment-transaction table, currently only used by the admin panel's first-party `/api/payments/*` routes — neither mobile nor web read/write it directly today (both go through the external call-server).

## Remaining Work

- [x] ~~Decide payment architecture~~ — resolved 2026-08-01: first-party `/api/payments/*` routes built, mirroring the admin panel
- [x] ~~Fix `localStorage`-only booking persistence for doctor appointments and pharmacy orders~~ — resolved 2026-08-01
- [x] ~~Delete dead code: `components/mobile-experience.tsx`~~ — resolved 2026-08-01
- [ ] Unused exports still in `components/customer-live.tsx` (`CustomerAuthForm`, `CustomerGuard`, 8 unused `Live*Panel` components) — not touched this session, lower priority than the payment fix
- [ ] Wire booking actions onto lab tests, hospitals, CT/MRI, rental equipment, staffing (catalog reads already work) — can now reuse the same `customer_transactions` first-party payment pattern
- [ ] Build ambulance booking, health card wizard, subscription plan purchase from scratch
- [ ] Complete auth: OTP, forgot/reset password, duplicate-account precheck
- [ ] Build net-new modules with no reference implementation anywhere: unified dashboard, unified order history, medical records, per-user notifications, doctor reviews, transaction history, refund status display
- [ ] Video/voice consultation + chat — still blocked, since the call-server was only replaced for payments, not Agora video/voice (mobile's video/voice still depends on it; web never had it)
- [ ] Rotate leaked Supabase DB password (independent, urgent, still outstanding)
- [ ] Commit the `README.md` credential removal
- [ ] Clarify/remove vestigial `pnpm-workspace.yaml` (project is npm-based)
- [ ] Full responsive/accessibility pass (Steps 29–30) — not started
- [ ] Manual end-to-end Razorpay checkout test with a real logged-in browser session (automated build/lint/typecheck passed, but the live payment round-trip has not been manually clicked through)
- [ ] Refund flow, transaction history page, duplicate-payment idempotency review — not built this pass

## External Blockers

1. **Video/voice consultation still depends on the external call-server.** Payments were successfully migrated off it, but Agora video/voice room + VoIP token registration were not (out of scope for the P0 fix). Exact remaining action: stakeholder must either grant access to the call-server's Agora integration details, or approve a first-party Agora integration for web (mirroring the admin panel's `NEXT_PUBLIC_AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` setup) when that module is prioritized.
2. **Supabase DB credential rotation**. Implementation status: exposure removed from the working copy of `README.md` (not committed). Exact remaining action: whoever administers the Supabase project must rotate the Postgres password; this cannot be done from within the codebase.
3. **Manual payment smoke test**. The first-party Razorpay integration passed typecheck/lint/build and rejects unauthenticated requests correctly, but has not been exercised end-to-end with a real browser session and a live Razorpay test-mode card. Exact remaining action: someone with a logged-in test account should click through a doctor booking or pharmacy checkout to confirm the full redirect round-trip.
