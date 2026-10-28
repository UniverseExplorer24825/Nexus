# Nexus Supabase Setup & Migration Guide

This document explains how to set up Supabase for the **Nexus** platform, obtain project credentials, and apply database migrations.

---

## 1. Prerequisites & Account Setup

1. Sign in or create a free account at [Supabase](https://supabase.com).
2. Create a new project:
   - **Name:** `Nexus` (or `nexus-hackathon`)
   - **Database Password:** Store this securely (never commit to git).
   - **Region:** Select the region closest to your users.
3. Wait for the project initialization to complete (~1-2 minutes).

---

## 2. Obtain Environment Credentials

In the Supabase Project Dashboard:
1. Navigate to **Project Settings** &rarr; **API**.
2. Find the following credentials:
   - **Project URL:** Copy the `URL` value.
   - **Project API Keys:**
     - `anon` / `public`: Copy the public anonymous key.
     - `service_role` / `secret`: Copy the service role key (**keep this secret**).
3. Copy `.env.example` to `.env.local` in your project root:
   ```bash
   cp .env.example .env.local
   ```
4. Update `.env.local`:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

> **Security Warning:**
> Never commit `.env.local` to version control. The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row-Level Security and must NEVER be exposed in browser code.

---

## 3. Applying Database Migrations

Nexus uses version-controlled SQL migrations located in `supabase/migrations/`:
- `20261028000001_initial_schema.sql`: Core tables, enums, triggers, exclusion constraints, and audit logging.
- `20261028000002_row_level_security.sql`: Row-Level Security policies and security-definer helper functions.
- `20261028000003_seed_data.sql`: Baseline institutions seed data.

### Option A: Via Supabase SQL Editor (Recommended for Quick Setup)

1. Open your Supabase Dashboard &rarr; **SQL Editor**.
2. Run the migration files in numerical order:
   - Paste the contents of `supabase/migrations/20261028000001_initial_schema.sql` and click **Run**.
   - Paste the contents of `supabase/migrations/20261028000002_row_level_security.sql` and click **Run**.
   - Paste the contents of `supabase/migrations/20261028000003_seed_data.sql` and click **Run**.
3. Verify that tables are created under **Table Editor**:
   - `institutions`
   - `profiles`
   - `resources`
   - `resource_availability`
   - `bookings`
   - `eligibility_checks`
   - `condition_reports`
   - `incidents`
   - `activity_logs`

### Option B: Via Supabase CLI

If you use the Supabase CLI:
1. Link your remote Supabase project:
   ```bash
   npx supabase link --project-ref <your-project-id>
   ```
2. Push migrations:
   ```bash
   npx supabase db push
   ```

---

## 4. Authentication Configuration

In the Supabase Dashboard &rarr; **Authentication** &rarr; **URL Configuration**:
1. **Site URL:** Set to `http://localhost:3000` (or your production deployment URL).
2. **Redirect URLs:** Add:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password`
   - `http://localhost:3000/**`

---

## 5. Security Architecture & Invariants

1. **Profile Generation & Privilege Isolation:**
   - When a user signs up, the `handle_new_user` database trigger automatically provisions a row in `public.profiles`.
   - The user's role is strictly defaulted to `member` and `verification_status` to `unverified`.
   - The `prevent_self_privilege_escalation` trigger rejects any attempt by regular users to modify their own `role` or `verification_status`.
2. **Exclusion Constraints for Active Bookings:**
   - Overlapping bookings on the same resource during active states (`approved`, `checked_out`) are prohibited at the database engine level via `btree_gist` GiST exclusion.
3. **Audit Immutability:**
   - The `activity_logs` table records state transitions automatically via database triggers (`on_booking_activity_event`).
   - Row-Level Security prohibits client-side `INSERT`, `UPDATE`, or `DELETE` on `activity_logs`.
