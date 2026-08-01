# Customer Web Panel — Mobile Parity Audit

**Date:** 2026-08-01 (P0 fix applied same day — see update note below)
**Scope:** `saiman-health-customer-panel` (web) vs `Saiman-Customer` (mobile, source of truth) vs `Saiman-Health-Admin-Panel` (backend contract authority).
**Method:** Direct code audit of all three repos (not documentation-based). Table names, RPCs, statuses below are grep-verified against actual `.from()`/`.rpc()`/`.storage.from()`/`.channel()` calls, not assumed.

> **2026-08-01 update (1):** the P0 money-in/no-fulfillment bug described below (§0, §3, §5) has been fixed. Payments were migrated to first-party `/api/payments/*` routes, and doctor booking / pharmacy checkout now write real `doctor_appointments` / `pharmacy_orders` rows. See `APP_PROCESS_LOG.md` for details. The rest of this document (browse-only modules, missing modules, auth gaps) is unchanged and still accurate as of this date.
>
> **2026-08-01 update (3):** the app shell (§20 "two conflicting navigation systems" complaint) has been fixed — one shared header (`components/site-header.tsx`) now serves both public and authenticated routes, replacing two independently-coded sidebars (one of which used letter-only nav icons). ~23 instances of developer-facing copy ("same as the app", "web view", "managed by super admin") were rewritten across doctor/pharmacy/lab/CT-MRI/hospital/rental/health-card/ambulance/subscription/support screens. This did **not** include a homepage rebuild, a full component library, or per-page visual redesign of the card/form/banner markup — those remain as described elsewhere in this document. See `APP_PROCESS_LOG.md`'s "Design System" section for exact scope.
>
> **2026-08-01 update (2):** §11 (Home Care & Staffing) and §4 (Instant Doctor Call) below are now **out of date** — both were rebuilt to full workflow parity (staffing: request-first flow with real `staffing_bookings`/`staffing_booking_items` writes and history; instant call: full assignment/connecting state machine, cancel, realtime, history). Doctor ratings (§3) are also no longer hardcoded. See `APP_PROCESS_LOG.md`'s 2026-08-01 "Staffing + instant-call functional parity" entry for full details, including the staffing payment-model decision (request-first/`payment_status: 'pending'`, not mobile's inconsistent hardcoded `'paid'`). Video/voice join within instant call remains genuinely blocked on Agora/call-server access — everything else in that flow is real. The UI redesign (design tokens, app shell) called for elsewhere in this document has **not** been done yet.

---

## 0. Executive Summary

The web panel is **not a blank slate** — it's a real Next.js 16 / App Router app with genuine Supabase integration for browsing/discovery, CMS, support tickets, and instant calls. But almost every **transactional** flow (anything that should create a durable booking/order row) is either:
- entirely absent (no page, no action), or
- present as a **read-only browse page** with no booking action wired up, or
- wired to a **real payment charge** that, on success, writes only to `localStorage`/`sessionStorage` instead of the Supabase table admin/providers actually read from.

This last pattern is the most dangerous one to leave as-is: a customer can pay via Razorpay for a doctor appointment or pharmacy order today, and **no row is created in `doctor_appointments` or `pharmacy_orders`** — the admin panel and providers never see it. That's a money-in/no-fulfillment bug, not a missing feature, and should be treated as the highest-priority fix regardless of what else gets prioritized.

**Also discovered:** a live Supabase Postgres connection string (with password) was committed in `README.md`. It has been stripped from the working file (not committed) — **the DB password must be rotated**, since it remains in git history. See §9.

**Also discovered:** both the web and mobile apps depend on a fourth, unaudited system — an external "call server" (`NEXT_PUBLIC_CALL_SERVER_URL` / `EXPO_PUBLIC_CALL_SERVER_URL`) that brokers Razorpay order creation/verification and Agora video/voice room + VoIP token registration. Its source is not in any of the three audited repos. The admin panel, by contrast, has its **own** first-party Razorpay integration (`app/api/payments/*`, server-side, using `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` directly). This is a real architectural fork: web/mobile go through an opaque external proxy; admin talks to Razorpay directly. See §8 and §11.

---

## 1. Authentication

| Module | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work | Verification |
|---|---|---|---|---|---|---|---|
| Registration form + validation | `app/(auth)/signup.tsx`, `lib/authValidation.ts` | `WebSignupScreen` (`components/web-app-experience.tsx`) | `users` table | Working | Partial — no shared validation module, email+password only | Port `authValidation.ts` rules (phone 10–15 digits, password ≥8 chars + letter + digit) to web | Not tested |
| Duplicate-account precheck | `AuthContext.signup()` → RPC `lookup_signup_conflicts` | none | RPC `lookup_signup_conflicts` | Working | Missing | Call the same RPC before `supabase.auth.signUp()` | Not tested |
| OTP verification | `app/(auth)/verify-signup.tsx`, `lib/signupOtp.ts` | none | Supabase Auth `verifyOtp({type:'signup'})` | Working (email delivery unverified live per mobile's own log) | Missing entirely | Build OTP screen + port `signupOtp.ts` config (length, expiry, cooldown, attempt/resend limits) | Not tested |
| OTP resend + cooldown + attempt limits | `lib/signupOtp.ts` | none | Supabase Auth `resend({type:'signup'})` | Working | Missing | Same as above | Not tested |
| Pending-signup persistence | `lib/pendingSignup.ts` (AsyncStorage) | none | local only | Working | Missing | Use `localStorage` equivalent; low priority if OTP is skipped for web | Not tested |
| Login | `app/(auth)/login.tsx` | `WebLoginScreen` | `auth.signInWithPassword` | Working, blocks unconfirmed email | Working, does **not** check `email_confirmed_at` | Add email-confirmed gate once OTP exists | Not tested |
| Logout | `AuthContext.logout()` | `logoutCustomer()` | `auth.signOut()` | Working | Working | None | Not tested |
| Forgot password | `app/(auth)/forgot-password.tsx` | none found | `auth.resetPasswordForEmail` | Working | **Missing** | Build page, port deep-link → web redirect logic | Not tested |
| Reset password | `app/(auth)/reset-password.tsx` | none found | `auth.updateUser({password})` | Working (handles `access_token`/`code`/`token_hash` recovery paths) | **Missing** | Build page | Not tested |
| Session restoration | `AuthContext` `getSession()` + `onAuthStateChange` | `lib/supabase-browser.ts` (`persistSession: true`, `autoRefreshToken: true`) | Supabase Auth | Working | Partial — session persists, but no explicit restore-then-redirect flow | Verify redirect-after-restore UX | Not tested |
| Protected routes | `app/_layout.tsx` redirect logic | `useAuthActionGuard()` — action-level only, no route middleware | n/a | Working (route-level) | **Weaker** — pages render regardless of auth; only specific *actions* are gated | Decide: is action-level gating sufficient for web, or add route-level protection (no `middleware.ts` exists today, unlike admin panel's `proxy.ts`) | Not tested |
| Role gating (reject non-`user` roles) | `AuthContext.fetchProfile()` force-signout | `getCurrentCustomer()` checks `role==='user'` | `users.role` | Working | Working | None | Not tested |
| Terms/privacy acceptance | not found in mobile audit | not found in web audit | — | Missing | Missing | New work both sides if required | Not tested |
| Account deletion | not found | not found | — | Missing | Missing | New work; needs admin-panel-side support too (not found there either) | Not tested |

---

## 2. Customer Dashboard (Step 8)

Neither app has a true unified dashboard matching the spec's requirements (greeting, profile completion, upcoming appointments, active consultations, instant-call status, orders across all verticals, health-card status, recent reports, transactions, refunds, notifications, open tickets — one screen).

| Item | Mobile | Web | Backend | Required Work |
|---|---|---|---|---|
| Profile screen with realtime counts | `app/(tabs)/profile.tsx` — realtime subscriptions on `users`, `customer_profile_settings`, `customer_subscriptions`, `doctor_appointments`, `lab_test_bookings`, `customer_saved_locations` | `WebProfileScreen` — one-time fetch, mostly a link menu | multiple tables | Web: add realtime; both: this is **counts**, not a dashboard |
| True unified dashboard (all verticals in one view) | Absent | Absent | union of all booking tables | **New build**, not a port — no reference implementation exists in either app |

**This is genuinely new work, not parity work.** Treat Step 8 as its own design/build task once the per-vertical booking tables are actually being written to by web (see §3–§7).

---

## 3. Doctor Consultation

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Listing + filters | `(tabs)/doctors.tsx` → `fetchApprovedDoctors()` | `WebDoctorsScreen` → `fetchApprovedDoctors()` | `users` (role=doctor), `doctor_specializations` | Working | Working (browse) | None major |
| Real ratings on listing | joined `fetchDoctorReviewSummaries()` from `doctor_reviews` | **hardcoded `4.8`** | `doctor_reviews` | Working | **Mock data in a production route** | Replace hardcoded rating with real aggregate query |
| Doctor profile | `app/doctor/[id].tsx` | `WebDoctorDetailScreen` | `users`, `doctor_reviews` | Working | Working (browse) | None major |
| Slot selection | computed client-side from `users.*_available_time` strings | **hardcoded** `"2026-07-26"` / `"05:00 AM"` sent to payment | `users` | Working | **Broken** — no real slot picker | Build slot picker reading the same availability strings |
| Booking creation (DB write) | `createDoctorAppointment()` → insert `doctor_appointments`, blocks duplicate active appointment | **Payment succeeds but booking is only saved to `localStorage`** — no insert into `doctor_appointments` | `doctor_appointments` | Working | **Broken (money-in/no-fulfillment)** | **P0**: insert into `doctor_appointments` on verified payment, not `localStorage` |
| Payment | external call-server (`lib/payments.ts`) → Razorpay | external call-server (`lib/web-payments.ts`) → Razorpay, same `NEXT_PUBLIC_CALL_SERVER_URL` pattern | Razorpay via call-server | Working | Working (charge succeeds) | Decide whether to keep call-server dependency or move to admin panel's first-party `/api/payments/*` pattern (see §8) |
| Appointment history | `(tabs)/appointments.tsx`, realtime | `WebAppointmentsScreen` — merges real `doctor_appointments` reads with local bookings | `doctor_appointments` | Working | Partial (real read exists, but nothing writes real rows — see above) | Fixed automatically once booking-creation bug is fixed |
| Reschedule | not confirmed present in mobile audit | not found | `doctor_appointments` | Unclear | Missing | Investigate mobile further if required; not in current mobile audit findings |
| Cancellation | status update pattern exists elsewhere; not explicitly confirmed for appointments in mobile audit | not found | `doctor_appointments.status` | Unclear | Missing | Investigate mobile further |
| Video/voice consultation join | `app/consultation/video.tsx`, Agora + CallKit (`lib/freeCalling.ts`, `lib/nativeCallKit.ts`) | **Absent entirely** | Agora (via call-server), `doctor_call_sessions` | Working | **Missing** | Needs Agora Web SDK integration + call-server VoIP token registration equivalent — significant new work, dependent on call-server access |
| Chat | `app/consultation/chat.tsx` | Absent | `doctor_consultation_messages`, storage `consultation-attachments` | Working | Missing | New build |
| Prescription view | `fetchAppointmentPrescriptions()` | Absent | `doctor_prescriptions` | Working | Missing | New build |
| Review submission | `submitDoctorReview()`, one per appointment | Absent | `doctor_reviews` | Working | Missing | New build |

**Note:** mobile itself has two duplicated navigation trees (`(tabs)/*` vs `consult/*`) calling identical backend functions — use either as reference, not both, when porting.

---

## 4. Instant Doctor Call

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Request creation | `(tabs)/instant-call.tsx` → `createInstantCallRequest()` | `WebInstantCallScreen` → `requestInstantCall()` | RPC `request_instant_call` | Working | Working | None |
| Duplicate-request guard | `fetchActiveInstantCallRequest()` before create | `fetchActiveInstantCallRequest()` | `instant_call_requests` | Working | Working | None |
| State machine transitions (connecting/in-progress) | RPCs `mark_instant_call_connecting`, `mark_instant_call_in_progress` | **Not called anywhere in web audit** | same RPCs | Working | Missing/Partial | Wire these RPC calls into the web call UI |
| Cancellation | RPC `cancel_instant_call` | not confirmed in web audit | RPC `cancel_instant_call` | Working | Missing | Add cancel action |
| Realtime status updates | `subscribeToInstantCallRequest()` on `instant_call_requests` | uses polling per web audit (`fetchActiveInstantCallRequest`), not confirmed realtime | `instant_call_requests` | Working (realtime) | Partial (polling, not realtime) | Switch to `postgres_changes` subscription for consistency and lower latency |
| Reconciliation (timeout/reassignment) | RPC `refresh_instant_call_request_state`, polled | not confirmed in web audit | same RPC | Working | Unclear/Missing | Verify and add if missing |
| Call history | **No dedicated screen exists even on mobile** | Absent | `instant_call_requests` | Missing (gap in mobile too) | Missing | New build for both — not a port |

---

## 5. Pharmacy

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Browse / catalog | `pharmacy/index.tsx` etc. | `WebPharmacyScreen` | `pharmacy_catalog_items`, `pharmacy_categories`, `pharmacy_product_approvals` | Working | Working (falls back to 4 hardcoded demo products if catalog empty — acceptable fallback, but verify it never masks a real empty state) | Minor: confirm fallback doesn't hide real data issues |
| Cart | `constants/pharmacyCartStore.ts` (module store) | `localStorage` cart | local only | Working | Working | None — equivalent approaches |
| Prescription upload | `uploadPrescriptionRequest()` + RPC `request_prescription_transfer` | **Absent** | storage `customer-prescriptions`, `customer_prescription_requests`, RPC `request_prescription_transfer` | Working | **Missing** | Port upload + transfer-request flow |
| Delivery address | real address capture | **hardcoded** ("D178, Industrial Area") | — | Working | **Broken/mock** | Build address form (reuse `customer_saved_locations` if applicable) |
| Checkout / order creation (DB write) | `createPharmacyOrder()` → `pharmacy_orders` + `pharmacy_order_items` | **Payment succeeds but order saved only to `localStorage`** | `pharmacy_orders`, `pharmacy_order_items` | Working | **Broken (money-in/no-fulfillment)** | **P0**: insert real order rows on verified payment |
| Order tracking | `fetchPatientPharmacyOrders()` | `/pharmacy/orders` reads `localStorage` only | `pharmacy_orders` | Working | **Broken** | Fixed once checkout writes real rows |
| Delivery status timeline | mapped via `pharmacyPatientStatus()` (`placed→accepted/packed→out_for_delivery→delivered`) | Not implemented (no real data to show) | `pharmacy_orders.status` | Working | Missing | Port status-mapping function |

---

## 6. Lab Tests

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Browse / catalog | `lab/index.tsx` | `WebLabTestsScreen` | `lab_test_catalog`, `lab_test_categories`, `lab_test_approvals` | Working | Working (browse only) | None |
| Home collection vs. center selection | `LabBookingDetails.collectionType` | **No booking action exists at all** | `lab_test_bookings` | Working | **Missing entirely** | New build: full booking flow (patient details, date/slot, prescription upload, payment, confirmation) |
| Booking creation | `createLabBooking()` | Missing | `lab_test_bookings`, `lab_test_booking_items` | Working | Missing | Same as above |
| Reports | `lab/reports.tsx` → `fetchPatientLabReports()` | Missing | `lab_test_reports` | Working | Missing | New build: secure report list + preview/download |

---

## 7. CT/MRI & Diagnostic Imaging

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Browse / catalog | `app/ct-mri/index.tsx` | `WebCtmriScreen` | `ctmri_service_catalog`, `ctmri_service_categories`, `ctmri_service_approvals` | Working | Working (browse only) | None |
| Booking flow (shared `diagnosticFlow.tsx` component covering all 7 modalities) | `app/ct-mri/[modality]/*` | **No booking action** | `ctmri_service_bookings` via `createProviderServiceBooking('ctmri', ...)` | Working | **Missing entirely** | New build, port the mobile booking flow shape |
| Booking history / reports / tracking | `ct-mri-bookings.tsx` etc. | Missing | `ctmri_service_bookings` | **Also broken on mobile — confirmed mock/empty-state stub, zero backend wiring** | Missing | This is **new work for both platforms**, not a port — mobile has no working reference here either |

---

## 8. Hospital & Surgery

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Browse / catalog | `(tabs)/hospitals.tsx` | `WebHospitalsScreen` | `hospital_service_catalog`, `hospital_service_categories`, `hospital_service_approvals` | Working | Working (browse only, page titled "Hospitals & Surgeries") | None |
| Inquiry / booking creation | `createProviderServiceBooking('hospital', ...)` | **No booking action** | `hospital_service_bookings` | Working (create only) | **Missing entirely** | New build |
| Booking history | **No screen exists even on mobile** (confirmed — insert only, no read-back screen found) | Missing | `hospital_service_bookings` | Missing (gap in mobile too) | Missing | New work for both |
| Common-contact-number inquiry pattern | `hospital-detail.tsx` reads `app_settings.hospital_common_contact_number` | not confirmed in web | `app_settings` | Working | Unclear | Port if this is the intended UX rather than a structured request form |

---

## 9. Ambulance Booking

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Location (pickup/drop) | `ambulance/booking.tsx`, `lib/locationVisibility.ts` | **Static page only** | — | Working | **Missing (0%)** | Full new build |
| Ambulance types | client-side selection | Missing | `ambulance_bookings.ambulance_type` | Working | Missing | Port |
| Request creation | `createAmbulanceRequest()`, auto-assigns first online ambulance | Missing | `ambulance_bookings` | Working | Missing | Port |
| Realtime tracking | `subscribeToRequest()`, `subscribeToDriverLocation()` | Missing | `ambulance_bookings`, `driver_locations` | Working | Missing | Port, needs a map component (Google Maps — env var already present, see §12) |
| History | `fetchPatientAmbulanceBookings()` | Missing | `ambulance_bookings` | Working | Missing | Port |
| Payment | `lib/payments.ts` | Missing | Razorpay via call-server | Working | Missing | Port |

**Current web state**: hardcoded phone number + 3 static copy blocks. This entire module needs to be built from nothing.

---

## 10. Rental Medical Equipment

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Browse / catalog | `rental-equi/inventory.tsx` | `WebRentalEquipmentScreen` | `rental_equipment_catalog_items`(admin)/approvals, `rental_equipment_categories` | Working | Working (browse only, "Rent" action not wired despite label) | None on browse |
| Order creation | `createRentalOrder()` (plan: daily/weekly/monthly/quarterly + deposit) | **Missing action** | `rental_orders` | Working | Missing | New build |
| Order history / tracking | `fetchRentalOrdersForPatient()` | Missing | `rental_orders` | Working | Missing | Port |
| Return request | `requestRentalReturn()` | Missing | `rental_orders.status='return_requested'` | Working | Missing | Port |
| Cancellation | `cancelRentalOrder()` | Missing | `rental_orders` | Working | Missing | Port |

---

## 11. Home Care & Staffing

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Provider/service browse | `staffing/home.tsx` | `WebCareStaffScreen` | `users` (role=staffing) | Working | Working (browse only, "hire" action not wired) | None on browse |
| Booking creation (multi-item) | `createStaffingBooking()` → `staffing_bookings` + `staffing_booking_items` | **Missing action** | `staffing_bookings`, `staffing_booking_items` | Working | Missing | New build |
| Realtime status | `subscribeToStaffingBooking()` | Missing | `staffing_bookings` | Working | Missing | Port |
| History | `fetchPatientStaffingBookings()` | Missing | `staffing_bookings` | Working | Missing | Port |
| Payment | **Not wired to verified-payment path even on mobile** — status set to `paid` directly on insert, no Razorpay charge enforced | Missing | — | **Gap on mobile too** | Missing | Decide correct behavior before porting — do not blindly copy mobile's bypass |
| Reviews | **No review capability exists for staffing anywhere** | Missing | — | Missing (by design apparently) | Missing | Confirm with product whether in scope |

---

## 12. Health Cards & Subscription Plans

These are two distinct features that share UI space.

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Health card application wizard | `app/health-card/*` (multi-step, draft persisted locally) | `WebHealthCardScreen` — **static stub, hardcoded plan list** | `health_card_applications`, storage `health-card-documents` | Working | **Missing entirely** | New build: full wizard (condition, documents, hospital picker via `hospital` provider marketplace, verification, confirmation) |
| Subscription plan purchase | `lib/subscriptions.ts` → `activateCustomerSubscription()` | `WebSubscriptionPlansScreen` — **static stub**, "Choose Plan" only auth-gates, no purchase logic | `customer_subscriptions`, `app_settings.customer_subscription_plans` | **Gap on mobile too — does not call the verified-payment path**, so it's unclear if this is actually charged | **Missing entirely** | Before porting: decide whether subscription purchase should go through Razorpay verification (recommended) rather than copying mobile's apparent bypass |

---

## 13. Medical Records

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Unified records view | `app/(tabs)/records.tsx` — **100% mock data** (`MOCK_RECORDS`, `MOCK_IMAGES`), zero Supabase calls | `WebRecordsScreen` — **100% static**, hardcoded counters | `doctor_prescriptions`, `lab_test_reports`, (imaging reports table not yet confirmed to exist for CT/MRI) | **Mock on mobile too** | **Mock** | **New build for both platforms** — this is not a port, there is no working reference implementation anywhere. Aggregate real data from `doctor_prescriptions` + `lab_test_reports` (+ future CT/MRI reports once §7 booking exists) |

---

## 14. Unified Booking & Order History

| Item | Mobile | Web | Backend | Status | Required Work |
|---|---|---|---|---|---|
| Cross-service history feed | **Does not exist on mobile** — every vertical has its own separate history screen; `profile.tsx` shows aggregate counts only | Does not exist | union of all booking/order tables | Missing on both | **New build, not a port.** Design against the union of: `doctor_appointments`, `instant_call_requests`, `pharmacy_orders`, `lab_test_bookings`, `ctmri_service_bookings`, `hospital_service_bookings`, `ambulance_bookings`, `rental_orders`, `staffing_bookings`, `health_card_applications` |

---

## 15. Payments, Transactions & Refunds

This is the most architecturally important module to get right before porting the booking flows above, since every P0 fix in §3/§5 depends on it.

| Item | Mobile | Web | Admin Panel (authoritative backend) | Status | Required Work |
|---|---|---|---|---|---|
| Order creation | POST to external call-server `/api/payments/create-order` | POST to same external call-server (`NEXT_PUBLIC_CALL_SERVER_URL`) | **First-party**: `app/api/payments/create-order/route.ts`, server-side Razorpay REST call, inserts `customer_transactions` row (`status:'created'`→`'pending'`) | Working (mobile), Working (web, but see below) | Recommend web switch to **its own first-party route** mirroring the admin panel's pattern (same Next.js runtime, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` server-side) instead of depending on the unaudited external call-server |
| Verification | call-server-side HMAC check | call-server-side HMAC check | **First-party**: `app/api/payments/verify/route.ts`, recomputes HMAC server-side, sets `customer_transactions.status='paid'` | Working | Same as above |
| Entity linking | POST `/api/payments/link-booking` | not confirmed | `app/api/payments/link-booking/route.ts` → sets `entity_id`/`entity_type` on transaction | Working (mobile) | This is the missing piece causing the "payment succeeds, no booking row" bug in §3/§5 — **web must call an equivalent after inserting the real booking row**, not skip straight to `localStorage` |
| `customer_transactions` table usage | **Never read directly by mobile app** — all reads/writes go through call-server API | **Not used by web at all** currently | Source of truth in admin panel | Working (admin) | Web should read/write this table (directly or via first-party API routes) to support transaction history (§15 below) and refund status display |
| Refunds | **No refund flow exists in mobile app** | **No refund flow exists in web app** | **Full implementation**: `app/api/payments/manage/route.ts` → `refundCustomerTransaction()`, real Razorpay refund call + updates linked entity + `pharmacy_refunds` | Missing (mobile), Missing (web) | Web needs a refund-status **display** (read `customer_transactions.refund_status`) at minimum; refund *initiation* is admin-only by design — confirm that's correct before building a customer-initiated refund request UI |
| Transaction history page | Not found | Not found | `app/(super-admin)/super-admin/transactions` (admin's own view) | Missing (customer-facing, both platforms) | New build: customer-facing `customer_transactions` list filtered by the logged-in user |
| Duplicate-payment prevention | Relies on call-server | Relies on call-server (same risk) | `customer_transactions.status` state machine | Unclear — depends on unaudited call-server | **Do not assume this is handled** — verify call-server behavior or move idempotency logic into a first-party route the web team controls |

**Status enum (authoritative, from admin panel SQL):** `customer_transactions.status`: `created | pending | paid | failed | cancelled | refunded`. `refund_status`: `not_requested | pending | processed | failed`. `service_type`: `doctor_consultation | pharmacy_order | lab_booking | ambulance_booking | rental_order | hospital_booking | ctmri_booking` (note: **staffing and health-card are not in this enum** — matches the mobile-side gap noted in §11/§12).

---

## 16. Support Tickets

This is the **most complete parity module already** — treat as close to done.

| Flow | Mobile File | Web File | Backend | Mobile Status | Web Status | Required Work |
|---|---|---|---|---|---|---|
| Ticket creation | `app/support.tsx` → `createSupportTicket()` | `WebSupportScreen` → `createSupportTicket()` | `support_tickets`, `support_ticket_messages` | Working | Working | None |
| Attachments | `uploadSupportMedia()` | present per web audit | storage `support-media` | Working | Working | Verify preview UX (image vs. document) matches spec Step 22 |
| Realtime replies | `subscribeSupportTicketMessages()` | not explicitly confirmed as realtime (may be fetch-based) | `support_ticket_messages` | Working (realtime) | Verify | Confirm web uses realtime subscription, not just fetch-on-load |
| Status handling | `Open \| In Progress \| Resolved \| Closed`, reply resets to `Open` | present | `support_tickets.status` | Working | Working | Verify closed-ticket UI restrictions (spec requires disabling reply on closed, with reopen option) |
| Booking/order linking | not confirmed in mobile audit | not confirmed in web audit | — | Unclear | Unclear | Verify if tickets can reference a specific booking/order; add if missing |

---

## 17. Notifications

| Item | Mobile | Web | Admin Panel | Status | Required Work |
|---|---|---|---|---|---|
| Per-user notification feed (read/unread) | **Does not exist** — confirmed absent, matches mobile's own process log | **Decorative bell icon only, no `onClick`, no list** | `admin_notifications` (admin-only, own read/unread + RPCs `mark_admin_notification_read`/`mark_all_admin_notifications_read`) — not a customer-facing table | Missing | Missing | **New build required — no per-user customer notification table exists anywhere in the three systems.** Needs schema design (new table) before UI work |
| CMS push/broadcast content | banners + `cms_blogs` only on mobile | `cms_pages`/`cms_blogs` (web is more mature here) | `cms_push_notifications` + realtime bridge (`WebNotificationBridge.tsx`, channel pattern `cms-push-web-${role}-${Date.now()}`) — **this bridge component lives only in the admin panel repo** | Partial | Missing | Could be adapted as a starting point for broadcast-style notifications, but does not solve per-user read/unread state — that still needs new schema |

---

## 18. Reviews & Ratings

| Item | Mobile | Web | Admin Panel | Status | Required Work |
|---|---|---|---|---|---|
| Doctor reviews (only vertical with reviews) | `lib/reviews.ts`, `submitDoctorReview()`, one review per appointment | **Absent** — doctor rating is a hardcoded `4.8` constant | `lib/admin-reviews.ts` — moderation (`visible\|hidden\|flagged`) | Working | Missing | Port submission flow; **must** respect `moderation_status` when displaying (only show `visible` reviews) |
| Reviews for other verticals (pharmacy, lab, ambulance, rental, staffing, hospital, ctmri) | **Do not exist anywhere** | Do not exist | No moderation infra for these either | Missing everywhere | Missing | Out of scope unless product wants new work beyond parity |

---

## 19. CMS Integration

Web is actually the **most mature** of the three apps here — surprising given the rest of the audit.

| Item | Mobile | Web | Admin Panel (source of truth) | Status | Required Work |
|---|---|---|---|---|---|
| Homepage/landing content | Not applicable (native app has no CMS-driven homepage) | `cms_pages.slug='home-landing'`, typed fallback content | `cms_pages` | — | Working (web) | None |
| About/Privacy/Terms/Support intro | N/A | `cms_pages` slugs: `about-us`, `privacy-policy`, `terms-and-conditions`, `support` | `cms_pages` | — | Working (web) | None |
| Blogs | banners + `cms_blogs` (list only) | `/blogs` full listing + homepage cards | `cms_blogs` | Working (mobile, minimal) | Working (web) | Add blog **detail** page if not present (web audit found listing only) |
| FAQs | Not found | **Not found in web** | `cms_faqs` | — | Missing | New build |
| Banners | consumed on mobile home | **Not confirmed consumed in web** | `banners` table + `banner-images` bucket + RPC `increment_banner_clicks` | Working (mobile) | Missing | Port banner display + click tracking |
| Media library | N/A (admin editor only) | Implicit via CMS content URLs | `cms_media`, bucket `cms-media` | — | Working indirectly | None required beyond what exists |
| Push/campaign content | N/A | Not consumed | `cms_push_notifications` (see §17) | — | Missing | Tied to §17 notification work |

---

## 20. Cross-Cutting Architectural Findings

1. **`localStorage`/`sessionStorage`-as-database anti-pattern (P0).** Doctor appointments and pharmacy orders on web are only durable in the customer's own browser. This must be fixed before any of the "browse-only" modules (§6–§11) are extended with real booking actions, or the same bug will simply be replicated ten more times.
2. **External call-server dependency is unaudited.** Both mobile and current web payment/video flows depend on `*_CALL_SERVER_URL`, whose source is not in any of the three repos. Recommend the web rebuild use the admin panel's first-party `/api/payments/*` pattern instead (same Next.js runtime, already correct: server-side order creation, HMAC verification, no secret exposure) rather than perpetuating dependence on an opaque fourth system — **unless** that call-server also brokers Agora video/voice, in which case video consultation (§3) has no alternative without either access to that service or a new first-party Agora integration.
3. **Leaked DB credential** — see §9 below (Security).
4. **Service-role key naming footgun in admin panel** (not a customer-web issue directly, but worth carrying forward): admin panel's primary env var name is `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — a `NEXT_PUBLIC_`-prefixed name for a secret. Confirmed all actual usages are server-side only today, but the naming itself is a latent risk. **The customer web panel must not repeat this naming pattern** — any service-role key it introduces must use a non-`NEXT_PUBLIC_` name, and ideally the customer web panel shouldn't hold a service-role key client-accessible at all.
5. **`pnpm-workspace.yaml` is vestigial** in the web repo — the project is actually npm-based (`package-lock.json`, no `pnpm-lock.yaml`, no `node_modules` workspace linkage). Worth deleting or clarifying to avoid future confusion (this explains the `pnpm-lock.yaml` deletion visible in the current git status).
6. **Dead code in web repo**: `components/mobile-experience.tsx` (1415 lines) and most of `components/customer-live.tsx` (8 unused `Live*Panel` components, `CustomerAuthForm`, `CustomerGuard`) are not imported by any live route. Should be deleted once confirmed unused, not left as confusing parallel implementations.
7. **Status enum casing is inconsistent across the backend** (ground truth from admin panel): most tables use lower_snake_case (`pending`, `confirmed`), but `staffing_bookings` uses Title Case with spaces (`'Pending'`, `'In Progress'`), `health_card_applications` uses Title Case (`'Under Review'`), `support_tickets` uses Title Case (`'In Progress'`), CMS statuses use `Published/Draft`/`Active/Inactive`. **The web panel must match these exact literal strings per table** — do not assume a single normalized status vocabulary.

---

## 21. Security Findings

| Finding | Severity | Status | Action |
|---|---|---|---|
| Live Postgres connection string with password committed in `README.md` | **Critical** | Removed from working file (uncommitted); still in git history | **Rotate the Supabase DB password immediately.** Scrubbing git history is a separate, optional follow-up (rewriting history affects all clones) |
| Client-side-only auth guard on web (`useAuthActionGuard`, no route middleware) | Medium | As-is | Acceptable for a marketing-heavy site if all sensitive actions are gated, but audit every "action" gate for completeness before relying on it for anything sensitive |
| `SUPABASE_SERVICE_ROLE_KEY` present in web `.env` but unused for privileged calls | Low (currently) | As-is, flagged | Confirmed only used to detect a misconfiguration state, never for privileged calls. Keep it that way — do not start making client-side calls with it |
| No `.env.example` in web repo | Low | Missing | Create one (see §12 of AGENTS.md instructions / this repo's own `.env.example` task) |

---

## 22. Environment Variables Reference (names only)

**Web panel currently has:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CALL_SERVER_URL
```

**Admin panel has (for reference — web will need equivalents for payments/maps/calling if going first-party):**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_AGORA_APP_ID
AGORA_APP_CERTIFICATE
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
NEXT_PUBLIC_APNS_KEY_ID / TEAM_ID / BUNDLE_ID / PRIVATE_KEY / USE_SANDBOX
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
```

**Mobile app additionally has:**
```
EXPO_PUBLIC_SIGNUP_OTP_LENGTH / RESEND_COOLDOWN_SECONDS / MAX_ATTEMPTS / MAX_RESENDS / EXPIRY_MINUTES
EXPO_PUBLIC_CALL_SERVER_URL
```

See §33 of the working instructions for what `.env.example` should document once the call-server-vs-first-party decision (§20.2) is made.

---

## 23. Suggested Prioritization (for discussion, not yet actioned)

This is offered as a starting point, not a decision — see the follow-up question to the user.

1. **P0 — Fix the money-in/no-fulfillment bug** (§3, §5): doctor booking and pharmacy checkout must write real rows, not `localStorage`.
2. **P0 — Rotate the leaked DB credential** (§21) — independent of all other work, do immediately.
3. **P1 — Decide the payment architecture**: first-party Razorpay routes (mirroring admin panel) vs. continued call-server dependency. This gates almost every other booking module.
4. **P1 — Wire booking actions onto the 5 browse-only catalogs** (lab, hospital, ct-mri, rental, staffing) — the read side already exists; each needs its create-booking + payment + confirmation flow.
5. **P2 — Ambulance, health cards** — full new builds, no partial credit exists on web today.
6. **P2 — Auth completeness**: OTP, forgot/reset password, duplicate-account precheck.
7. **P3 — Net-new modules with no reference implementation on either platform**: unified dashboard, unified order history, medical records, per-user notifications, instant-call history.
8. **P3 — Video/voice consultation** — blocked on call-server access decision (§20.2).
