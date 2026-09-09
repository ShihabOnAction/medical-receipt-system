# Medical Receipt System

Money receipt and required test list for the **Department of Neurology**, replacing the carbon-copy pad with one shared, auditable system.

```
React (Vite + Tailwind)  →  Node/Express API  →  Supabase PostgreSQL
        browser                 business rules          data + auth
```

The browser never talks to the database directly for hospital data. Serial numbers, prices, totals and PDF rendering all happen on the server, so two counters can work at the same time without ever producing a duplicate serial or a wrong amount.

---

## What it does

**Staff**

- Register (Gmail only) → wait for an administrator to approve the account
- Issue a receipt: patient details, searchable multi-select of investigations, automatic total
- Get a six-digit serial number assigned by the database
- Print, view or download a true A4 PDF
- Search their own receipt history by serial, patient or referring doctor

**Administrators**

- Approve, reject, suspend and promote staff
- Manage the test catalogue and prices (with history-safe disable instead of delete)
- See every receipt in the department, filter by staff, date and status
- Cancel (void) a receipt with a recorded reason — receipts are never edited or deleted
- Change everything printed on the receipt, and the colour of the whole interface, from Settings
- Read a complete audit log

---

## Repository layout

```
medical-receipt-system/
├── backend/                 Node.js + Express API
│   ├── src/
│   │   ├── config/          env + Supabase clients
│   │   ├── controllers/     request handlers
│   │   ├── routes/          one file per resource
│   │   ├── middleware/      auth, roles, validation, errors, rate limits
│   │   ├── services/        receipts, PDF, settings, audit
│   │   ├── templates/       the printed receipt (HTML + generated CSS)
│   │   ├── validators/      Zod schemas
│   │   └── utils/           amount-in-words, formatters
│   └── assets/logo.png
├── frontend/                React + Vite + Tailwind
│   ├── src/
│   │   ├── components/      ui/, layout/, receipt/, dashboard/
│   │   ├── pages/           auth/, staff/, admin/
│   │   ├── context/         auth, settings, theme, toasts
│   │   ├── services/        API client per resource
│   │   ├── hooks/           useAuth, useTheme, useDebounce, …
│   │   └── utils/           theme engine, currency, dates, validation
│   └── public/logo.png
├── supabase/migrations/     0001 → 0005, run in order
└── docs/                    setup and deployment guides
```

---

## Quick start

Full step-by-step instructions live in **[docs/SETUP.md](docs/SETUP.md)**. In short:

1. **Create a Supabase project**, then run `supabase/migrations/0001…0005` in the SQL editor, in order.
2. **Backend**

   ```bash
   cd backend
   cp .env.example .env      # fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
   npm install
   npm run dev               # http://localhost:4000
   ```

3. **Frontend**

   ```bash
   cd frontend
   cp .env.example .env      # fill in the URL + ANON key + VITE_API_URL
   npm install
   npm run dev               # http://localhost:5173
   ```

4. **Create the first administrator** — from `backend/`, using the service-role key:

   ```bash
   npm run create-admin -- your.admin@gmail.com --password "YourStrongPassword"
   ```

   Every administrator after that is promoted from **Admin → Staff & access**.

---

## The parts that matter

### Serial numbers

`public.create_receipt()` calls `nextval('receipt_serial_seq')` inside the same transaction that inserts the receipt. Two concurrent requests can never receive the same value, and the sequence is not reachable from the browser. The number of printed digits (`000018` vs `0018`) is a setting, not code.

### Prices and totals

The browser sends only `testIds`. The API reads the prices from Postgres, computes the total itself, and compares it with the total the browser displayed — a mismatch means someone changed a price mid-form, and the staff member is asked to confirm the refreshed amount rather than being handed a wrong receipt.

### History that stays true

`receipt_items` stores `test_name` and `unit_price` as a snapshot, and an `UPDATE`/`DELETE` trigger makes those rows immutable. Change a price in 2027 and a 2026 receipt still prints 2026 prices. A test used by past receipts is disabled, never deleted.

### Corrections

Receipts are append-only. The only correction path is `void_receipt()`, which is admin-only, requires a reason, keeps the serial number, writes an audit entry, and stamps **CANCELLED** across the print-out.

### PDF

Puppeteer renders the receipt from an HTML template into a real vector A4 PDF — text stays selectable and printers stay sharp. One Chromium instance is shared and warmed up at boot. The template's CSS is generated from the settings row (font, size, colours, row count), so the hospital retunes the print-out without a deploy.

### Dynamic styling

One brand colour in Settings is expanded at runtime into a full 50–900 ramp and written onto `:root` as CSS custom properties. Every Tailwind class in the app resolves to those properties, so the entire interface re-skins instantly. Each staff member independently controls light/dark/system, row density, text size and corner rounding — also pure CSS variables, saved per browser.

### Security

- The `service_role` key exists only in the backend environment; the browser holds the public anon key and uses it for authentication only.
- Every request re-verifies the token, the role **and** the account status.
- Row Level Security is enabled on all six tables as defence in depth, and the privileged RPCs are revoked from `anon` and `authenticated`.
- Registration domain rules, prices, roles and totals are validated server-side regardless of what the browser sends.
- Helmet, CORS allow-list, per-route rate limits, and Zod validation on every body and query.

---

## API

| Method | Route | Who |
|---|---|---|
| POST | `/api/auth/register` | public |
| GET / PATCH | `/api/auth/me` | signed in |
| POST | `/api/auth/session` | signed in |
| GET | `/api/settings` | signed in |
| GET | `/api/stats/dashboard` | approved |
| GET | `/api/tests` | approved |
| POST | `/api/receipts` | approved |
| GET | `/api/receipts` · `/:id` · `/:id/pdf` · `/:id/html` | approved (own only, unless admin) |
| GET / PATCH | `/api/admin/users` · `/:id/status` · `/:id/role` | admin |
| POST / PATCH / DELETE | `/api/admin/tests` | admin |
| POST | `/api/admin/receipts/:id/void` | admin |
| PATCH | `/api/admin/settings` | admin |
| GET | `/api/admin/audit-logs` | admin |

Every response is `{ success, data, message? }` or `{ success: false, error: { code, message, details? } }`.

---

## Deployment

Frontend → Vercel, backend → Render or Railway, database → Supabase. See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**, including the Puppeteer/Chromium notes for each host.
