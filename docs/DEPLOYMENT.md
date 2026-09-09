# Deployment guide

Three managed services, no hospital server to maintain:

```
Vercel            Render / Railway          Supabase
  React      →      Node API          →     PostgreSQL + Auth + backups
```

The hospital receives one URL. Nothing is installed on the counter PCs.

---

## 1. Supabase (production project)

Use a **separate project** from the one you developed against.

1. Create it, choose the region nearest Dhaka (Singapore).
2. Run `supabase/migrations/0001…0005` in order in the SQL editor.
3. **Authentication → Providers → Email**: enable e-mail/password, disable public sign-ups if you want registration to go exclusively through the API (the API creates users with the service-role key either way).
4. **Authentication → URL configuration**: set the Site URL to your production frontend URL, and add `https://your-frontend/reset-password` to the redirect allow-list, so password-reset links land in the right place.
5. **Database → Backups**: confirm daily backups are on. Point-in-time recovery is worth the paid tier for financial records.
6. Create the first administrator (see [SETUP.md](SETUP.md) step 6).

---

## 2. Backend → Render

The API needs Chromium for the PDF engine, so it must run as a normal web service, not a serverless function.

**New → Web Service**, connected to the repository:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Runtime | Node |
| Build command | `npm install` |
| Start command | `npm start` |
| Instance type | at least 512 MB RAM — Chromium needs headroom |

Environment variables:

```ini
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=…                       # server only
FRONTEND_URL=https://receipt.yourdomain.com       # comma-separate several
ALLOWED_EMAIL_DOMAINS=gmail.com
TZ_NAME=Asia/Dhaka
LOG_LEVEL=combined
PUPPETEER_CACHE_DIR=/opt/render/project/src/backend/.cache/puppeteer
```

`PUPPETEER_CACHE_DIR` keeps the downloaded browser inside the persisted project directory; without it Render can discard it between builds and PDF generation fails at runtime.

**Railway** works the same way — set the root directory to `backend`, the same variables, and `npm start`.

Check `https://your-api.onrender.com/health` after the first deploy.

> Free Render instances sleep when idle, and the first request after a sleep also has to start Chromium. For a hospital counter, use a paid instance.

---

## 3. Frontend → Vercel

**New Project**, same repository:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

Environment variables (all three are public by design — never add the service-role key):

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=…
VITE_API_URL=https://your-api.onrender.com/api
VITE_APP_NAME=Medical Receipt System
```

Because the app uses client-side routing, add `frontend/vercel.json` so a refresh on `/admin/receipts` does not 404:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

(That file is already in the repository.)

---

## 4. Custom domain

1. Point `receipt.yourdomain.com` at Vercel (CNAME).
2. Add the domain in Vercel; HTTPS is issued automatically.
3. Update `FRONTEND_URL` on the API to the final domain and redeploy the API.
4. Update the Supabase Site URL and redirect allow-list.

---

## 5. Go-live checklist

- [ ] Migrations `0001`–`0005` ran on the production project
- [ ] `select count(*) from tests;` returns 29
- [ ] First administrator created via `promote_to_admin`
- [ ] `/health` returns `success: true`
- [ ] Registration from a non-Gmail address is rejected
- [ ] A pending account cannot open the receipt form
- [ ] Approving a staff member lets them sign in immediately
- [ ] A receipt issues, and the serial increments by one on the next
- [ ] Two receipts issued from two browsers at once get different serials
- [ ] The PDF opens, prints on A4 and downloads
- [ ] Changing a test price does **not** change any existing receipt
- [ ] Staff cannot open `/admin/*` (the API returns 403, not just the UI hiding it)
- [ ] Cancelling a receipt stamps CANCELLED and writes an audit entry
- [ ] Hospital name, bank details and logo are correct in Settings
- [ ] Supabase daily backups are enabled

---

## 6. Running it

**Backups.** Supabase handles the daily snapshot. For a financial record, also export monthly:

```sql
copy (
  select r.serial_number, r.receipt_date, r.patient_name, r.total_amount, r.status, i.test_name, i.unit_price
  from receipts r join receipt_items i on i.receipt_id = r.id
  where r.receipt_date >= date_trunc('month', now()) - interval '1 month'
  order by r.serial_number
) to stdout with csv header;
```

**Monitoring.** Point any uptime checker at `/health`. Watch Render's memory graph — repeated PDF generation is the heaviest thing the API does.

**Updating.** Push to the default branch; Vercel and Render redeploy. Database changes go in a new numbered file under `supabase/migrations/` — never edit a migration that has already been run.

**Rotating the service-role key.** Supabase → Settings → API → roll the key, update it on Render, redeploy. The frontend is unaffected because it never had it.
