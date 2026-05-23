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

2. **Configure your environment**
   ```bash
   cp .env.example .env
   # edit .env — set BASE_PATH to match your repo name for production builds
   ```
   > Local dev defaults to `/` automatically. For GitHub Pages, `BASE_PATH` should be `/your-repo-name/`.

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

### 1. Configure Pages source
1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions** (NOT a branch).
   > ⚠️ If you accidentally leave it set to "Deploy from a branch", GitHub Pages will serve the raw source files — the browser will try to load `/src/main.jsx` and you'll get a 404.

### 2. Set base path
The base path must match your repository name so asset URLs resolve correctly.

Option A — Repository variable (recommended):
- Go to **Settings → Secrets and variables → Actions → Variables**
- Name: `BASE_PATH`
- Value: `/your-repo-name/` (e.g. `/fifadashboard/`)

Option B — Fallback default:
- Edit `vite.config.js` and change the fallback: `env.BASE_PATH || '/your-repo-name/'`

### 3. Deploy
The included `.github/workflows/deploy.yml` will automatically build and deploy on every push to `main`.

Alternatively, deploy manually with:
```bash
BASE_PATH=/your-repo-name/ npm run build
# then upload the `dist/` folder via the Pages settings
```

---

## Troubleshooting

### `main.jsx:1  Failed to load resource: 404`
This means the browser is loading the **raw source** `index.html` instead of the **built** `dist/index.html`. Check:

1. **Pages source** must be set to **GitHub Actions**, not a branch.
   - `Settings → Pages → Build and deployment → Source: GitHub Actions`
   - If it says "Deploy from a branch", change it.
2. **Build succeeded** — check the Actions tab for a green checkmark on the latest run.
3. **Base path matches repo name** — if your repo is `fifa-ops` but the base path is `/fifadashboard/`, all JS/CSS assets will 404.
   - Set the `BASE_PATH` repository variable (see Deploy section above).
4. **Browser cache** — hard-refresh (`Ctrl+Shift+R` or `Cmd+Shift+R`) after fixing.

### All assets 404 but no console errors
The `base` path in Vite doesn't match the GitHub Pages URL. Example:
- Your repo name: `world-cup-ops-site`
- Your Pages URL: `https://user.github.io/world-cup-ops-site/`
- Set `BASE_PATH=/world-cup-ops-site/`

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
3. For GitHub Actions deployment, add the key as an **environment secret** (recommended over repository secrets so it only exposes during the Pages deploy job):
   - Go to **Settings → Environments**
   - Click the `github-pages` environment (or create it if it doesn't exist)
   - Select **Add environment secret**
   - Name: `VITE_AZURE_MAPS_KEY`
   - Value: your Azure Maps key
   - (Optional: add protection rules like required reviewers or deployment branches)
4. **Restrict the key** in the Azure Portal by HTTP referrer to prevent abuse:
   - `https://yourusername.github.io/*`

> **Note:** Because the workflow already declares `environment: github-pages`, `${{ secrets.VITE_AZURE_MAPS_KEY }}` will automatically prefer the environment secret. If no environment secret exists, it falls back to a repository secret with the same name.

---

## Admin / Edit Mode

Because there's no server, the Admin page uses a simple toggle + `localStorage`:
- Click **Enable Edit Mode**
- Post new alerts — they persist in your browser's localStorage
- In a real deployment, you'd replace this with an authenticated backend or a serverless function elsewhere

---

## License

MIT
