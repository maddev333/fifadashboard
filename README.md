# FIFA World Cup Operations Website

> Adapted from the original specification for **GitHub Pages** deployment.

## Spec Review & Architecture Changes

The original spec is well-structured for **Azure Static Web Apps + Azure Functions**. Since we're targeting **GitHub Pages**, here are the key adaptations:

| Original Spec | GitHub Pages Adaptation |
|---|---|
| Azure Functions (API proxy) | ❌ Not available — using **static JSON** files + direct client-side fetch |
| Azure Maps Web SDK | ✅ Used directly. Key is baked into bundle — restrict by HTTP referrer in Azure Portal |
| Azure AD / Entra ID auth | ➡️ Client-side "Edit Mode" toggle with **localStorage** persistence |
| Cosmos DB / Table Storage | ➡️ Static JSON in `/public/data/` |
| Next.js | ➡️ **React + Vite** (simpler, faster, perfect for static export) |
| Normal browser routing | ➡️ **Hash Router** (`/#/map`, `/#/matches`, etc.) to avoid 404s on refresh |

### Security note on Azure Maps key
Since GitHub Pages is purely static, the Azure Maps subscription key is exposed in the client-side bundle. You **must** restrict the key by HTTP referrer in the Azure Portal:
- Allowed referrer: `https://yourusername.github.io/*`
- If using a custom domain, add that too.

### What carries over exactly from the spec
- All 6 pages: Dashboard, Live Map, Match Ops, Intelligence Feed, Staffing, Admin
- All JSON data models (Venue, Match, Incident, Staffing, Alert)
- Component architecture (Header, KPI cards, Alert banner, filters)
- The phased build plan (this scaffold covers Phases 1 and a lightweight Phase 3)
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
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── LiveMap.jsx
│   │   ├── MatchOps.jsx
│   │   ├── IntelligenceFeed.jsx
│   │   ├── Staffing.jsx
│   │   └── Admin.jsx
│   ├── hooks/
│   │   └── useData.js
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

2. **Update your repo name in `vite.config.js`**
   ```js
   const BASE = '/fifadashboard/'
   ```
   > If your repo is `yourusername.github.io/fifadashboard`, keep it exactly as written. If your repo name differs, change this value.

3. **Update `package.json` homepage**
   ```json
   "homepage": "https://yourusername.github.io/fifadashboard"
   ```

4. **Run locally**
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
The included `.github/workflows/deploy.yml` will automatically build and deploy on every push to `main`.

Alternatively, deploy manually with:
```bash
npm run build
# then upload the `dist/` folder via the Pages settings
```

---

## How to customize data

All operational data lives in `/public/data/*.json`. Edit these files and push — they'll be deployed immediately with the next build.

If you want to move to a real backend later, swap the `useData` hook for `fetch()` calls to your API.

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
4. **Restrict the key** in the Azure Portal by HTTP referrer to prevent abuse:
   - `https://yourusername.github.io/*`

---

## Admin / Edit Mode

Because there's no server, the Admin page uses a simple toggle + `localStorage`:
- Click **Enable Edit Mode**
- Post new alerts — they persist in your browser's localStorage
- In a real deployment, you'd replace this with an authenticated backend or a serverless function elsewhere

---

## License

MIT
