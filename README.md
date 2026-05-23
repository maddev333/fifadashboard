# FIFA World Cup Operations Website

> Adapted from the original specification for **GitHub Pages** deployment.

## Spec Review & Architecture Changes

The original spec is well-structured for **Azure Static Web Apps + Azure Functions**. Since this project is currently targeting **GitHub Pages**, here are the key adaptations:

| Original Spec | GitHub Pages Adaptation |
|---|---|
| Azure Functions (API proxy) | ❌ Not available — using **static JSON** files + direct client-side fetch |
| Azure Maps Web SDK | ✅ Used directly. Key is baked into bundle — restrict by HTTP referrer in Azure Portal |
| Azure AD / Entra ID auth | ➡️ Client-side demo-only **Edit Mode** with `localStorage` persistence |
| Cosmos DB / Table Storage | ➡️ Static JSON in `/public/data/` |
| Next.js | ➡️ **React + Vite** (simpler, faster, good for static hosting) |
| Normal browser routing | ➡️ **Hash Router** (`/#/map`, `/#/matches`) to avoid 404s on refresh |

### Security note on Azure Maps key
Since GitHub Pages is purely static, the Azure Maps subscription key is exposed in the client-side bundle. You **must** restrict the key by HTTP referrer in the Azure Portal:
- Allowed referrer: `https://maddev333.github.io/*`
- If using a custom domain, add that too.

### What carries over from the spec
- All 6 pages: Dashboard, Live Map, Match Ops, Intelligence Feed, Staffing, Admin
- JSON data models (Venue, Match, Incident, Staffing, Alert)
- Component architecture (header, KPI cards, alert banner, filters)
- The phased build plan (this scaffold covers Phase 1 plus a lightweight demo admin flow)
- Dark command-center aesthetic

---

## Project Structure

```
.
├── public/
│   └── data/
│       ├── venues.json
│       ├── matches.json
│       ├── incidents.json
│       ├── staffing.json
│       └── alerts.json
├── src/
│   ├── components/
│   │   └── Header.jsx
│   ├── hooks/
│   │   ├── useAlerts.js
│   │   └── useData.js
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── LiveMap.jsx
│   │   ├── MatchOps.jsx
│   │   ├── IntelligenceFeed.jsx
│   │   ├── Staffing.jsx
│   │   └── Admin.jsx
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── .github/
│   └── workflows/
│       └── deploy.yml
├── index.html
├── vite.config.js
└── package.json
```

---

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Confirm the production base path**
   `vite.config.js` is already configured for this repository:
   ```js
   const BASE = process.env.NODE_ENV === 'production' ? '/fifadashboard/' : '/'
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```

---

## Deploy to GitHub Pages

### Enable Pages
1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions**.

### Deploy
The included `.github/workflows/deploy.yml` will build and deploy on every push to `main`.

---

## How to customize data

All operational data lives in `/public/data/*.json`. Edit these files and push — they will deploy with the next build.

If you want to move to a real backend later, replace the `useData` and `useAlerts` hooks with authenticated API calls.

---

## Azure Maps Setup

1. Get a [subscription key from Azure Maps](https://learn.microsoft.com/en-us/azure/azure-maps/how-to-manage-account-keys)
2. Copy `.env.example` to `.env` and paste your key:
   ```bash
   cp .env.example .env
   # edit .env
   ```
3. For GitHub Actions deployment, add the key as a repository secret:
   - Go to **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `VITE_AZURE_MAPS_KEY`
   - Value: your Azure Maps key
4. Restrict the key in the Azure Portal by HTTP referrer:
   - `https://maddev333.github.io/*`

If the key is missing, the Live Map page now falls back to an operations summary instead of leaving a blank map container.

---

## Admin / Edit Mode

Because there is no backend, the Admin page is a demo-only client workflow:
- Click **Enable Edit Mode**
- Post new alerts — they persist in your browser's local storage
- Dashboard and other alert-driven views can read those custom alerts through a shared hook
- For production, replace this with authenticated storage or serverless APIs

---

## License

MIT
