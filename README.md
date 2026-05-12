# 🚚 FreightOS — Driver Dashboard

**100% free. Zero API keys. Safe to push to public GitHub.**

A professional trucking dashboard with interactive maps, HOS-aware ETA prediction, and load profitability analysis — built entirely on free, open services.

---

## Free Services Used

| Service | Purpose | Cost | Key Required |
|---|---|---|---|
| [Leaflet.js](https://leafletjs.com) | Interactive map | Free | ❌ None |
| [CartoDB Dark Matter](https://carto.com/basemaps) | Dark map tiles | Free | ❌ None |
| [OpenStreetMap](https://www.openstreetmap.org) | Map data | Free | ❌ None |
| [Nominatim](https://nominatim.openstreetmap.org) | City autocomplete / geocoding | Free | ❌ None |
| [OSRM](https://project-osrm.org) | Route distance calculation | Free | ❌ None |

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Run locally — that's it, no .env needed
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Features

### Map Tool
- Full interactive Leaflet map with dark CartoDB tiles
- City autocomplete powered by Nominatim (OpenStreetMap)
- Route visualization with OSRM road routing
- Syncs automatically with routes calculated in ETA Predictor

### ETA Predictor
- Type city names → Nominatim shows live autocomplete suggestions
- Distance auto-calculated via OSRM (real road routing)
- Fallback to Haversine estimate if OSRM is temporarily unavailable
- FMCSA HOS rules applied automatically:
  - Max 11 driving hours per on-duty period
  - 30-min break after 8 cumulative hours
  - 10-hr off-duty reset after 11-hr limit
- Shows exact arrival **date** and **time** (handles multi-day trips)

### Profit Calculator
- True Rate Per Mile gauge with color-coded zones
- Green > $3.00, Yellow $2.50–$3.00, Red < $2.50

---

## Deploy to GitHub Pages

### 1. Update `vite.config.ts`
```ts
base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
```

### 2. Push to GitHub — no secrets needed
```bash
git add .
git commit -m "Initial deploy"
git push origin main
npm run deploy
```

Your app is live at `https://your-username.github.io/your-repo-name/`

### Optional: GitHub Actions CI
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```
No secrets to configure — it just works.

---

## Rate Limits (Free Tier)

| Service | Limit | Notes |
|---|---|---|
| Nominatim | 1 req/sec | The app debounces searches to 600ms — stays safe |
| OSRM demo | Soft limits | For heavy production use, [self-host OSRM](https://github.com/Project-OSRM/osrm-backend) |
| CartoDB tiles | Very generous | Fine for any personal/small team use |

---

## Tech Stack

- **React 18** + TypeScript
- **Vite** — dev server & build
- **Tailwind CSS**
- **Leaflet 1.9** — mapping library
- **@types/leaflet** — full TypeScript types
- **gh-pages** — one-command deployment
