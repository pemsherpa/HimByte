# Deploy: Render (API) + Cloudflare Pages (frontend)

This repo serves the **Express API** from Render and the **Vite React app** from Cloudflare Pages. The client calls the API using `VITE_API_URL` (see `client/src/lib/api.js`).

## Prerequisites

- GitHub (or GitLab) repo connected to both platforms
- **Supabase** project with URL, anon key, and service role key
- After first deploy: note **Render service URL** (e.g. `https://himbyte-api.onrender.com`) and **Cloudflare Pages URL** (e.g. `https://himbyte.pages.dev`)

---

## 1. Render — Web Service (API)

### Option A — Blueprint (`render.yaml`)

1. Push this repo (including `render.yaml`) to Git.
2. In [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repository and apply. Adjust **plan** in `render.yaml` if needed (`free` spins down after idle; use **Starter** or higher for always-on).

### Option B — Manual Web Service

1. **New** → **Web Service** → connect the repo.
2. **Root directory:** leave empty (repository root).
3. **Build command:** `npm install && npm install --prefix server`
4. **Start command:** `npm start`
  (runs `npm run start --prefix server` → `node src/index.js` in `server/`.)
5. **Instance type:** Free (trial) or **Starter+** for no spin-down.

### Environment variables (Render → Environment)

Set at least:


| Key                         | Notes                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `production`                                                                                                                                                            |
| `SUPABASE_URL`              | Supabase project URL                                                                                                                                                    |
| `SUPABASE_ANON_KEY`         | Public anon key                                                                                                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** — server-side operations                                                                                                                                     |
| `CLIENT_URL`                | Comma-separated **origins** of your Cloudflare app, e.g. `https://himbyte.pages.dev,https://app.yourdomain.com` (no trailing slashes). Required for CORS in production. |
| `APP_URL`                   | Public URL of the **frontend** (QR codes, links). Same as primary Pages URL unless you use a different marketing domain.                                                |


Optional (if you use them):

- `SMTP_`* — email (demo requests, guest notifications)
- `ESEWA_`* — eSewa payments
- `SUPABASE_DB_PASSWORD` / `DATABASE_URL` — migrations from CI or local only

**Do not** set `VITE_`* on Render unless you also run a Vite build there — the browser bundle is built on Cloudflare.

### Verify

Open `https://<your-service>.onrender.com/api/health` — expect JSON with `status: "ok"` and `demo: false` when Supabase is configured.

---

## 2. Cloudflare Pages — Frontend

1. In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the repo. Configure the build:


| Setting                    | Value                          |
| -------------------------- | ------------------------------ |
| **Framework preset**       | None (or Vite if detected)     |
| **Root directory**         | `client`                       |
| **Build command**          | `npm install && npm run build` |
| **Build output directory** | `dist`                         |


1. **Environment variables** (Production and Preview as needed):


| Variable                 | Value                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Same as `SUPABASE_URL`                                                                                                          |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY`                                                                                                     |
| `VITE_API_URL`           | Render API **origin only**, no path — e.g. `https://himbyte-api.onrender.com`                                                   |
| `VITE_APP_URL`           | **Recommended:** `https://himbyte.pages.dev` (full URL, no trailing slash). Used for **QR codes**. **Do not** enter `window.location.origin` — that is not valid; the literal text becomes the hostname and breaks scans (NXDOMAIN). If unset or invalid, the app uses the current browser origin. |


1. Save and deploy. After the first deploy, copy the **Pages URL** and add it to Render’s `CLIENT_URL` (and redeploy the API if CORS was blocking).

### SPA routing

`client/public/_redirects` is copied into `dist` so client-side routes resolve on refresh.

### Custom domain

In Pages → **Custom domains** → add `app.yourdomain.com`. In Render, extend `CLIENT_URL` and set DNS as Cloudflare instructs.

---

## 3. Supabase Auth URLs

In Supabase → **Authentication** → **URL configuration**:

- **Site URL:** your production frontend URL (e.g. `https://himbyte.pages.dev` or custom domain).
- **Redirect URLs:** include the same origin(s) plus any preview URLs you use (e.g. `https://*.pages.dev/`* if you enable wildcard patterns — follow Supabase docs for your plan).

---

## 4. Order of operations (first time)

1. Deploy **Render** with `CLIENT_URL` temporarily empty or set to a placeholder; confirm `/api/health`.
2. Deploy **Cloudflare Pages** with `VITE_API_URL` pointing at Render.
3. Update Render `**CLIENT_URL`** to your real Pages URL(s); redeploy API.
4. Update **Supabase** redirect/site URLs.
5. Smoke-test: login, guest menu with `?r=slug&table=…`, staff dashboard.

---

## 5. Local development (unchanged)

- Root `.env` with `VITE_`* and server vars; leave `**VITE_API_URL` unset** so the client uses `/api` and Vite proxies to `localhost:3001`.

---

## 6. Troubleshooting


| Issue                       | What to check                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------- |
| CORS errors in browser      | `CLIENT_URL` on Render matches exact frontend origin (scheme + host + port if any). |
| API calls go to wrong host  | `VITE_API_URL` set at **build** time on Pages; rebuild after changing it.           |
| `/api/health` 404 on Render | Start command / root directory; service must listen on `process.env.PORT`.          |
| Auth redirect loops         | Supabase Site URL and redirect allowlist.                                           |


