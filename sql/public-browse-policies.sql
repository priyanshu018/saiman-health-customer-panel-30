grant usage on schema public to anon;

grant select on public.users to anon;
grant select on public.pharmacy_catalog_items to anon;
grant select on public.pharmacy_product_approvals to anon;
grant select on public.lab_test_catalog to anon;
grant select on public.hospital_service_catalog to anon;
grant select on public.ctmri_service_catalog to anon;
grant select on public.lab_test_approvals to anon;
grant select on public.hospital_service_approvals to anon;
grant select on public.ctmri_service_approvals to anon;
grant select on public.rental_equipment_approvals to anon;

drop policy if exists "Anonymous users can read approved marketplace providers" on public.users;
create policy "Anonymous users can read approved marketplace providers"
on public.users
for select
to anon
using (
  role = any (
    array[
      'doctor'::user_role,
      'staffing'::user_role,
      'lab'::user_role,
      'hospital'::user_role,
      'ctmri'::user_role,
      'ambulance'::user_role,
      'pharmacy'::user_role,
      'pharmacy_admin'::user_role,
      'rental'::user_role,
      'rental_admin'::user_role
    ]
  )
  and lower(coalesce(verification_status, 'pending')) = 'approved'
);

drop policy if exists "Anonymous users can read active lab test catalog" on public.lab_test_catalog;
create policy "Anonymous users can read active lab test catalog"
on public.lab_test_catalog
for select
to anon
using (is_active = true);

drop policy if exists "Anonymous users can read active pharmacy catalog items" on public.pharmacy_catalog_items;
create policy "Anonymous users can read active pharmacy catalog items"
on public.pharmacy_catalog_items
for select
to anon
using (is_active = true);

drop policy if exists "Anonymous users can read active hospital service catalog" on public.hospital_service_catalog;
create policy "Anonymous users can read active hospital service catalog"
on public.hospital_service_catalog
for select
to anon
using (is_active = true);

drop policy if exists "Anonymous users can read active CTMRI service catalog" on public.ctmri_service_catalog;
create policy "Anonymous users can read active CTMRI service catalog"
on public.ctmri_service_catalog
for select
to anon
using (is_active = true);

drop policy if exists "Anonymous users can read approved lab test approvals" on public.lab_test_approvals;
create policy "Anonymous users can read approved lab test approvals"
on public.lab_test_approvals
for select
to anon
using (status = 'Approved');

drop policy if exists "Anonymous users can read approved pharmacy products" on public.pharmacy_product_approvals;
create policy "Anonymous users can read approved pharmacy products"
on public.pharmacy_product_approvals
for select
to anon
using (
  status = 'Approved'
  and coalesce(is_active, false) = true
);

drop policy if exists "Anonymous users can read approved hospital service approvals" on public.hospital_service_approvals;
create policy "Anonymous users can read approved hospital service approvals"
on public.hospital_service_approvals
for select
to anon
using (status = 'Approved');

drop policy if exists "Anonymous users can read approved CTMRI service approvals" on public.ctmri_service_approvals;
create policy "Anonymous users can read approved CTMRI service approvals"
on public.ctmri_service_approvals
for select
to anon
using (status = 'Approved');

drop policy if exists "Anonymous users can read approved rental equipment" on public.rental_equipment_approvals;
create policy "Anonymous users can read approved rental equipment"
on public.rental_equipment_approvals
for select
to anon
using (
  status = 'Approved'
  and coalesce(is_active, false) = true
);
