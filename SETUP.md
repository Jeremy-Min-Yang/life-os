# Life OS — Local Setup Guide

## Prerequisites

- Node.js 18+ and npm
- A Google account
- A Google Cloud Platform project

---

## Step 1: Install Dependencies

```bash
cd homeweb
npm install
```

---

## Step 2: Google Cloud Setup

### 2a. Create OAuth Credentials (for user login)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g. "life-os")
3. Enable **Google Sheets API** and **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret**

### 2b. Create Service Account (for server-side Sheets access)

1. Go to **IAM & Admin → Service Accounts → Create**
2. Name it `life-os-server`
3. Skip role assignment (optional for now)
4. Go to the service account → **Keys → Add Key → Create JSON key**
5. Download the JSON file — copy `client_email` and `private_key`

---

## Step 3: Create the Google Sheets Database

1. Go to [sheets.google.com](https://sheets.google.com) → Create new spreadsheet
2. Name it "Life OS"
3. Create 4 sheets (tabs): `Tasks`, `Diary`, `Training`, `Metrics`
4. Copy the **Spreadsheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`
5. Share the spreadsheet with your service account email (Editor access):
   `life-os-server@your-project.iam.gserviceaccount.com`

The app will auto-create headers on first run.

---

## Step 4: Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=life-os-server@your-project.iam.gserviceaccount.com
# Copy private_key from JSON, keep quotes, escape newlines as \n
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"

# Optional: restrict to your email only
ALLOWED_EMAIL=you@gmail.com
```

**Private key tip:** In the downloaded JSON, the `private_key` field uses literal `\n`. Paste it directly into `.env.local` wrapped in double quotes.

---

## Step 5: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

You'll be redirected to sign in with Google. After sign-in, you land on the dashboard.

---

## Step 6: Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and connect via [vercel.com/new](https://vercel.com/new).

**Add all env vars** from `.env.local` to Vercel project settings.

Update Google OAuth redirect URI to:
`https://your-app.vercel.app/api/auth/callback/google`

---

## Architecture Summary

```
src/
├── types/           # Domain types (DB-agnostic)
├── lib/
│   ├── sheets/      # Google Sheets client + schema (column maps)
│   ├── cache/       # In-memory cache with TTL + cache-aside helper
│   ├── auth/        # NextAuth config
│   ├── validation/  # Zod schemas
│   └── utils/       # API helpers, cn()
├── services/        # Domain logic (tasks, diary, training, metrics)
│                    # ← Only layer that knows about Sheets
├── hooks/           # Client-side data fetching (useTasks, useDashboard)
├── components/
│   ├── ui/          # Button, Card, Badge (design system primitives)
│   ├── layout/      # AppShell, Sidebar
│   ├── dashboard/   # TasksWidget, TrainingWidget, MetricsWidget
│   ├── tasks/       # TaskForm
│   └── training/    # TrainingForm
└── app/
    ├── api/         # Route handlers (thin — delegate to services)
    ├── dashboard/   # Main dashboard
    ├── tasks/       # Task management
    ├── diary/       # Journal
    ├── training/    # Training log + charts
    ├── metrics/     # Daily metrics + trend charts
    └── settings/    # Account info

```

## Future Migration to Postgres

1. Replace `src/services/*.ts` implementations with Prisma/pg queries
2. Keep all function signatures identical
3. Remove `src/lib/sheets/` folder
4. All API routes, hooks, and UI are untouched

The abstraction boundary is the service layer. Nothing above it knows about the database.

## Google Sheets Rate Limits

- 100 requests / 100 seconds per user (service account = 1 user)
- Cache TTLs are tuned to stay safely below this:
  - Tasks: 30s, Dashboard: 60s, Training: 120s, Metrics: 300s
- Each dashboard load = 1 Sheets read (cached aggregation)

## Training Load Model (CTL/ATL/TSB)

Uses the Banister impulse-response model (same as TrainingPeaks):

- **TSS** per session = `(durationHrs × RPE²) × 100/81` (RPE-based estimate)
- **CTL** (fitness) = 42-day exponential moving average of daily TSS
- **ATL** (fatigue) = 7-day exponential moving average of daily TSS
- **TSB** (form) = CTL - ATL
  - TSB > +10: fresh, ready to race
  - TSB 0 to -10: optimal training zone
  - TSB < -20: accumulated fatigue, recovery needed
