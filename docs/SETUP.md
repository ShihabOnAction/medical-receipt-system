# Setup guide

From an empty machine to a working system. Roughly 20 minutes.

---

## 1. Prerequisites

- **Node.js 20 or newer** (`node -v`)
- A free **Supabase** account — <https://supabase.com>
- Chromium is downloaded automatically by Puppeteer during `npm install` in `backend/`

---

## 2. Create the Supabase project

1. **New project** → pick a region close to Dhaka (Singapore is the usual choice), set a strong database password and keep it somewhere safe.
2. Wait for provisioning, then open **Project Settings → API** and copy:
   - `Project URL`
   - `anon` `public` key — this one may go in the browser
   - `service_role` key — **server only, never in the frontend, never in git**

---

## 3. Create the database

Open **SQL Editor** in Supabase and run the migration files **in order**, one at a time:

| File | What it creates |
|---|---|
| `supabase/migrations/0001_schema.sql` | enums, six tables, indexes, `updated_at` triggers, the serial sequence |
| `supabase/migrations/0002_functions.sql` | `create_receipt`, `void_receipt`, dashboard stats, the `auth.users → profiles` bridge, immutability triggers |
| `supabase/migrations/0003_rls.sql` | Row Level Security and its policies, RPC permission revokes |
| `supabase/migrations/0004_seed.sql` | the default settings row and the 29 investigations with their prices |
| `supabase/migrations/0005_bootstrap_admin.sql` | the `promote_to_admin()` helper |

Check it worked:

```sql
select count(*) from public.tests;      -- 29
select * from public.settings;          -- one row, id = 1
```

> Using the Supabase CLI instead? `supabase db push` picks the same files up from `supabase/migrations/`.

---

## 4. Backend

```bash
cd backend
cp .env.example .env
npm install          # this also downloads Chromium for the PDF engine
npm run dev
```

Fill in `.env`:

```ini
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # service_role, server only
FRONTEND_URL=http://localhost:5173
ALLOWED_EMAIL_DOMAINS=gmail.com
PORT=4000
```

Verify: <http://localhost:4000/health> returns `{"success":true,...}`.

---

## 5. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Fill in `.env`:

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...               # anon key only
VITE_API_URL=http://localhost:4000/api
```

Open <http://localhost:5173>.

---

## 6. Create the first administrator

There is no default password anywhere in this repository. Create the account
yourself, from the backend, with the service-role key:

```bash
cd backend
npm run create-admin -- your.admin@gmail.com --password "YourStrongPassword"
```

That creates the login (pre-confirmed) and marks the profile `ADMIN` /
`APPROVED` in one step. If you already made the user in **Authentication ->
Users**, drop the `--password` and it just promotes the existing account:

```bash
npm run create-admin -- your.admin@gmail.com
```

Sign in at `/login`. You land on the admin dashboard.

> **Why not the SQL editor?** `supabase/migrations/0005` also ships a
> `promote_to_admin()` function, and on many projects
> `do $do$ begin perform public.promote_to_admin('you@gmail.com'); end $do$;`
> works fine. But some Supabase projects run the SQL editor under a
> restricted role, where it fails with *permission denied for function* or
> *new row violates row-level security policy* - RLS doing its job, since
> the editor has no signed-in user. The script above has no such problem
> because the service-role key bypasses RLS by design. Use it and ignore the
> SQL route.
>
> After the first admin exists, nobody needs any of this: promote further
> administrators from **Admin -> Staff & access** with a button.

## 7. Add the first staff member

1. They open `/register` and sign up with a `@gmail.com` address.
2. They see the **waiting for approval** screen — a pending account cannot issue anything.
3. You approve them from **Admin → Staff & access** (or straight from the admin dashboard card).
4. They sign in and can issue receipts immediately.

---

## 8. Make it yours

**Admin → Settings** controls, with a live preview beside it:

- Hospital name (English and Bangla), address, department, logo
- Receipt title, bank name, account label and number
- Currency symbol and the word used in the amount line
- Serial digits and an optional prefix (`000018` or `NEU-0018`)
- Minimum table rows, PDF font and base font size
- Whether the bank box and the OPD/Ward/Bed/Reg. No. lines are printed
- The interface colour — one hex value expands into the whole palette

**Admin → Tests & prices** controls the catalogue. Prices always come from here; nothing is hard-coded in the frontend.

To replace the logo, drop your file at `frontend/public/logo.png` **and** `backend/assets/logo.png` (the PDF embeds it as a data URI), or point `logoUrl` at a full `https://` address.

---

## 9. Everyday checks

```bash
# Is the API up?
curl http://localhost:4000/health

# Which serial comes next?
select last_value from public.receipt_serial_seq;

# Today's collection
select count(*), sum(total_amount)
from public.receipts
where status = 'ACTIVE'
  and receipt_date = (now() at time zone 'Asia/Dhaka')::date;
```

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `Missing environment variable(s)` on boot | `backend/.env` is missing or incomplete. |
| Login works but every page says *waiting for approval* | The profile is not `APPROVED` yet. Approve it from Admin → Staff & access, or run `npm run create-admin -- that@email.com` in `backend/`. |
| `Cannot reach the server` in the browser | The API is not running, or `VITE_API_URL` points somewhere else. |
| CORS error in the console | Add the exact browser origin to `FRONTEND_URL` in `backend/.env` (comma-separate multiple ones). |
| PDF fails with a Chromium error | Run `npx puppeteer browsers install chrome` in `backend/`, or set `PUPPETEER_EXECUTABLE_PATH` to a system Chrome. |
| Print opens nothing | The browser blocked the pop-up. Allow pop-ups for the site — *Download* works regardless. |
| `permission denied for function promote_to_admin`, or *new row violates row-level security policy* in the SQL editor | Your project runs the SQL editor under a restricted role. Do not fight it — use `npm run create-admin` from `backend/` instead (step 6). |
| `PRICE_CHANGED` when saving a receipt | An admin changed a price while the form was open. The list refreshes; confirm the new amount and submit again. This is intentional. |
