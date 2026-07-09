-- Admin users table
create table if not exists public.admin_users (
  user_id uuid not null primary key references auth.users (id) on delete cascade,
  role text not null default 'staff',
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint admin_users_role_check check (role = any (array['super_admin'::text, 'staff'::text]))
);

-- Admin logs table
create table if not exists public.admin_logs (
  id uuid not null default gen_random_uuid () primary key,
  admin_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  table_name text not null,
  record_id text null,
  metadata jsonb null,
  created_at timestamp with time zone not null default now()
);

-- Message flags table
create table if not exists public.message_flags (
  id uuid not null default gen_random_uuid () primary key,
  message_id uuid not null references public.messages (id) on delete cascade,
  reason text not null,
  notes text null,
  flagged_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default now()
);

-- Soft delete + moderation columns
alter table public.users add column if not exists is_blocked boolean not null default false;
alter table public.users add column if not exists deleted_at timestamp with time zone null;
alter table public.campaigns add column if not exists deleted_at timestamp with time zone null;
alter table public.campaign_bookings add column if not exists deleted_at timestamp with time zone null;
alter table public.payments add column if not exists deleted_at timestamp with time zone null;
alter table public.messages add column if not exists deleted_at timestamp with time zone null;
alter table public.conversations add column if not exists deleted_at timestamp with time zone null;
alter table public.conversation_participants add column if not exists deleted_at timestamp with time zone null;
alter table public.brand_profiles add column if not exists deleted_at timestamp with time zone null;
alter table public.creator_directory add column if not exists deleted_at timestamp with time zone null;
alter table public.creator_profiles add column if not exists deleted_at timestamp with time zone null;
alter table public.creator_packages add column if not exists deleted_at timestamp with time zone null;
alter table public.creator_package_platform_prices add column if not exists deleted_at timestamp with time zone null;
alter table public.creator_niches add column if not exists deleted_at timestamp with time zone null;
alter table public.creator_socials add column if not exists deleted_at timestamp with time zone null;
alter table public.promo_codes add column if not exists deleted_at timestamp with time zone null;
alter table public.promo_redemptions add column if not exists deleted_at timestamp with time zone null;

-- Helpful indexes
create index if not exists admin_logs_admin_id_idx on public.admin_logs (admin_id);
create index if not exists admin_logs_created_at_idx on public.admin_logs (created_at desc);
create index if not exists message_flags_message_id_idx on public.message_flags (message_id);
