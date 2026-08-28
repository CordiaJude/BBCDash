# Dealership Appointment Board

A replacement for the sales-floor whiteboard: a rep dashboard, a manager admin view, and a
read-only TV display, all kept in sync live via Supabase Realtime.

## One-time setup

### 1. Database

Your Supabase project is already wired up in `.env.local`. Open the SQL editor for that project
(`https://supabase.com/dashboard/project/ufdlkaoaxrxjsnylnfop/sql/new`) and run, in order:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — creates the
   `users`, `appointments`, and `tv_settings` tables, the `rep-photos` storage bucket, RLS
   policies, and enables Realtime on `appointments` and `tv_settings`.
2. [`supabase/migrations/0002_email_password_auth.sql`](supabase/migrations/0002_email_password_auth.sql)
   — renames `users.username` → `users.email` and `users.pin_hash` → `users.password_hash` for
   the email + password login model. **If you already have accounts from before this change,**
   their `email`/`password_hash` values will hold their old username/PIN data after the rename
   and won't work with the new login form — re-bootstrap or reset them (see step 3).

### 2. Install dependencies

```bash
npm install
```

### 3. Create the first manager account

There's no public sign-up screen (by design — a manager creates every account). Bootstrap the
first manager from the command line:

```bash
node scripts/create-admin.mjs jane@dealership.com "Jane Smith" a-strong-password
```

(email must look like a real address; password must be at least 8 characters.)

Log in at `/login` with that email and password, then use **Admin → Reps & managers** to add
everyone else (each new account is created with the next unused color from the palette).

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. `/login` → `/dashboard` (reps and managers) → `/admin`
(managers only) → `/tv` (leave logged in full-screen on the showroom TV).

## How auth works

Custom email + password login (not Supabase Auth, no email verification step) — a manager
creates every account directly with an email and password, passwords are hashed with bcrypt
server-side, and a signed session cookie (HS256 JWT, `SESSION_SECRET` in `.env.local`) gates
`/dashboard`, `/admin`, and `/tv`.

All writes (appointments, users, tv_settings) go through Next.js API routes using the Supabase
**service role** key, which bypasses Row Level Security. The browser only ever holds the **anon**
key, which can `select` (for Realtime + reads) but cannot write anything directly — see the RLS
policies at the bottom of the migration file for the full reasoning.

## Deploying to Vercel

```bash
vercel deploy
```

Set the four variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`) as Vercel
environment variables before deploying to production.
