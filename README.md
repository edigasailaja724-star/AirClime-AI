# AirClime — Global Environmental Intelligence Platform

AirClime is a responsive, real-time environmental intelligence web platform built with React, TypeScript, Vite, Tailwind CSS, Leaflet + OpenStreetMap, Chart.js, Express, and the Gemini API. It requires **no database**, **no user accounts**, and stores **no location history**.

## Features & Modules

1. **Discover** — Localized time-of-day greeting, live location clock, animated AQI gauge, live sky condition visualizer, Weather Comfort Index, active alerts, forecasted outdoor window, and quick navigation across all modules.
2. **Air Intelligence** — Air Quality Command Center with animated AQI gauge, dominant pollutant diagnostics, 24-hour & 7-day CAMS trends, PM2.5 vs PM10 profiling, Pollution Exposure Intelligence (activity intensity & duration), and Air Quality Q&A insights.
3. **Sunlight & Solar** — Astronomical solar elevation/azimuth/declination, animated sunrise-to-sunset arc, golden & blue hour windows, date daylight comparison, UV risk forecast, and Open-Meteo shortwave/direct/diffuse solar irradiance.
4. **Weather Intelligence** — Animated weather scene synced to live WMO codes, Weather Comfort Index, 24-hour condition transition timeline, visibility, barometric pressure, 12-hour outlook, and 7-day forecast table & charts.
5. **EarthScope** — Interactive Leaflet + OpenStreetMap map with 7 spatial telemetry layers (Air Quality, PM2.5, Temperature, Wind, Precipitation, UV Index, Cloud Cover) via live 3×3 Open-Meteo grid sampling, AtmosCompare markers, and optional RainViewer radar.
6. **Snow & Storm Radar** — Precipitation, snowfall, convective storm energy (CAPE), wind gusts, NWS/WMO advisories, and a RainViewer timeline clearly distinguishing **Actual Radar Observations** from **Short-Range Model Nowcasts**.
7. **AirClime-ai** — Streaming multilingual environmental copilot (**English**, **Telugu**, **Hindi**) powered by `@google/genai` on the Express backend, with 6 instant AI actions, response copy, and floating bottom-right globe launcher.
8. **LifeSync** — Activity-calibrated (walking/jogging/cycling/outdoor work + duration) outdoor suitability, inhaled PM2.5 estimate, hydration, clothing, UV, daylight, and sensitive-group guidance.
9. **AtmosCompare** — Multi-city live comparison (2–4 cities) across AQI, PM2.5, PM10, temperature, humidity, wind, UV, sunrise/sunset, daylight, precipitation, Best Air/UV/Comfort badges, and on-demand AI city comparison.
10. **EcoSmart** — Daily sustainability challenge, Water Conservation Calculator, Electricity-Saving Calculator, Transport Emission Estimator, local checklist, and environmental learning cards.
11. **Daily Report** — Printable & PDF-exportable (`window.print()`) daily environmental briefing with share/clipboard export and on-demand AI summary.
12. **Alert Center** — Category-filtered alert monitor (`Poor Air Quality`, `High UV`, `Extreme Heat`, `Heavy Rain`, `Strong Wind`, `Severe Weather`) combining official NOAA NWS bulletins (US) and transparent telemetry thresholds.
13. **Data Lab** — Interactive parameter explorer (single or dual-parameter Line/Bar charts, hourly to multi-day horizon) with CSV dataset export.

## Data Sources

- **Weather & Forecast**: Open-Meteo Forecast API (ECMWF / GFS / ICON)
- **Air Quality**: Open-Meteo Air Quality API (Copernicus CAMS)
- **Geocoding**: Open-Meteo Geocoding API & OpenStreetMap Nominatim
- **Live Precipitation Radar**: RainViewer Public Radar API
- **Official Severe Alerts (US)**: NOAA National Weather Service (`api.weather.gov`)

---

## Local Installation & Running

### Prerequisites
- Node.js 22+
- npm 10+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables Securely
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:3000
PORT=3000
```
> **Security Note:** Never prefix `GEMINI_API_KEY` with `VITE_` and never commit `.env` to Git. `server.ts` accesses `process.env.GEMINI_API_KEY` exclusively on the server and proxies `/api/airclime-ai` and `/api/airclime-ai/stream`.

### 3. Run in Development
```bash
npm run dev
```
Open `http://localhost:3000`.

### 4. Production Build & Start
```bash
npm run build
npm start
```

---

## Deploying the Website

### Option A: Google AI Studio / Cloud Run
1. Add `GEMINI_API_KEY` in **Settings > Secrets** (or Cloud Run environment variables).
2. Build command: `npm run build`
3. Start command: `npm start` (`NODE_ENV=production node server.ts`)

### Option B: Render / Railway / Fly.io / VPS
1. Push your repository (without `.env`) to GitHub.
2. Connect the repository to your Node.js hosting provider.
3. Set `GEMINI_API_KEY` and `NODE_ENV=production` in the provider's environment variable dashboard.
4. Configure Build Command `npm run build` and Start Command `npm start`.

### Option C: Vercel
To deploy on Vercel with the `/api/*` backend routes:
- Set `GEMINI_API_KEY` in **Project Settings > Environment Variables**.
- Expose Express routes as Vercel Serverless Functions under `api/` or deploy the Node server directly on a full-stack runtime (e.g. Cloud Run / Render) so `server.ts` handles `/api/airclime-ai`, `/api/airclime-ai/stream`, `/api/reverse-geocode`, `/api/alerts`, and static `dist/` assets seamlessly.

---

## Publishing Source Code to a Public GitHub Repository

1. Verify `.env` is ignored in `.gitignore` and never tracked:
   ```bash
   git status
   ```
2. Initialize and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: AirClime Environmental Intelligence Platform"
   ```
3. Create a public repository on GitHub (without README/license if pushing an existing repo), then push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/airclime.git
   git push -u origin main
   ```
