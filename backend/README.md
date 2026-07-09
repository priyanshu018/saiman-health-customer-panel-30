# Drippify Admin Backend

Production-ready Admin API for the influencer marketplace. Built with Express + Supabase.

This package is self-contained and can be deployed as its own repo/service.

## Setup
1. Create the admin schema and soft-delete columns:

```sql
-- run this inside Supabase SQL editor
\i admin-backend/sql/001_admin_schema.sql
```

2. Create a storage bucket named `admin-uploads` (or update `ADMIN_BUCKET`).
3. Create a Supabase user to act as an admin, then insert into `admin_users`:

```sql
insert into public.admin_users (user_id, role)
values ('<ADMIN_AUTH_USER_ID>', 'super_admin');
```

4. Configure environment variables:

```
cp admin-backend/.env.example admin-backend/.env
```

5. Install and run:

```
cd admin-backend
npm install
npm run dev
```

## Auth
- Send `Authorization: Bearer <SUPABASE_ACCESS_TOKEN>`
- Token is validated using `SUPABASE_JWT_SECRET`.
- Access is allowed only if the user exists in `admin_users` and `is_active = true`.

## API Docs
- Swagger UI: `http://localhost:8080/docs`
- Health: `http://localhost:8080/health`

## Deploy
- Set the environment variables from `.env.example` in your hosting provider.
- Run `npm install`.
- Build with `npm run build`.
- Start with `npm start`.

## Notes
- All list endpoints support: `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, and optional filters.
- Soft deletes are implemented via `deleted_at` columns.
- Generic CRUD is available at `/api/tables/:table` for all allowed tables.
- For `conversation_participants`, use `:id` in the format `conversation_id:user_id`.
