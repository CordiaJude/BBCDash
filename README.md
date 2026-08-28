# Dealership Appointment Board

A replacement for the sales-floor whiteboard: a rep dashboard, a manager admin view, and a
read-only TV display, all kept in sync live via Supabase Realtime.

## One-time setup

### 1. Database

Your Supabase project is already wired up in `.env.local`. Open the SQL editor for that project
(`https://supabase.com/dashboard/project/ufdlkaoaxrxjsnylnfop/sql/new`) and run the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates the
`users`, `appointments`, and `tv_settings` tables, the `rep-photos` storage bucket, RLS policies,
and enables Realtime on `appointments` and `tv_settings`.

### 2. Install dependencies

```bash
npm install
```

### 3. Create the first manager account

There's no public sign-up screen (by design — a manager creates every account). Bootstrap the
first manager from the command line:

```bash
node scripts/create-admin.mjs jsmith "Jane Smith" 1234
```

Log in at `/login` with that username and PIN, then use **Admin → Reps & managers** to add
everyone else (each new account is created with the next unused color from the palette).

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. `/login` → `/dashboard` (reps and managers) → `/admin`
(managers only) → `/tv` (leave logged in full-screen on the showroom TV).

## How auth works

Custom username + 4-digit PIN login (not Supabase Auth) — PINs are hashed with bcrypt
server-side, and a signed session cookie (HS256 JWT, `SESSION_SECRET` in `.env.local`) gates
`/dashboard`, `/admin`, and `/tv` via `src/middleware.ts`.

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
