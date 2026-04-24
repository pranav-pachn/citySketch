# CitySketch

CitySketch is an AI-assisted urban layout studio that converts natural-language prompts into structured city plans and lets you inspect/edit the result across multiple views.

## What You Can Do

- Generate zoning layouts from text prompts
- Import a real-world map area (OpenStreetMap/Overpass) and generate a contextual simulation
- Explore generated plans in 2D, 3D, blueprint, and code views
- Edit cells manually and save snapshots
- Store and reload history (Supabase with automatic local fallback)
- Sign in with Google (frontend + backend token verification)

## Repository Structure

- `backend_ai/` Express API and generation engine
  - `server.js` app bootstrap and route mounting
  - `routes/` API routes (`generate`, `history`, `mapContext`)
  - `utils/` city generation and local history fallback
- `frontend_ai/` React + Vite + TypeScript UI
  - `src/` app routes, workspace, components, store, helpers
  - `landing_ui/next-landing/` experimental/alternate landing implementation
- `.env.example` environment variable template
- `prd.md` product notes
- `CitySketch_Logic_Guide.html` generation logic guide

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start

1. Install backend dependencies:

```bash
cd backend_ai
npm install
```

2. Install frontend dependencies:

```bash
cd ../frontend_ai
npm install
```

3. Create root `.env` from `.env.example` and set values.

4. Start backend:

```bash
cd ../backend_ai
npm run dev
```

5. Start frontend:

```bash
cd ../frontend_ai
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Environment Variables

Environment is loaded from the root `.env` file.

### Backend

- `PORT` (default: `3001`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- AI provider keys (at least one provider required):
  - `OPENROUTER_API_KEY` or `OPENROUTER_API_KEYS`
  - `GEMINI_API_KEY` or `GEMINI_API_KEYS`
  - `GROQ_API_KEY` or `GROQ_API_KEYS`
- `GOOGLE_CLIENT_ID` (required for `/api/auth/google` verification)

### Frontend

- `VITE_GOOGLE_CLIENT_ID` (used by Google OAuth client)
- `VITE_API_BASE_URL` (optional; if empty, frontend uses relative `/api`)
- `VITE_DEV_API_TARGET` (used by Vite dev proxy, default `http://localhost:3001`)

## API Overview

Base URL: `http://localhost:3001`

- `GET /` backend status summary
- `GET /api` endpoint index
- `GET /api/health` health check
- `POST /api/generate` generate layout from prompt
  - Body: `{ prompt: string, saveToHistory?: boolean }`
- `POST /api/generate-from-map` generate from bounding box + OSM context
  - Body: `{ bbox: [south, west, north, east], gridSize?: number, locationName?: string }`
- `GET /api/history` list history snapshots
- `POST /api/history` save current layout snapshot
  - Body: `{ prompt?: string, layoutData: GridCell[][], ai_model?: string }`
- `DELETE /api/history/:id` delete snapshot
- `POST /api/auth/google` verify Google ID token
  - Body: `{ token: string }`

## Persistence Behavior

History writes/reads use Supabase table `city_layouts` when available.
If Supabase fails or is unavailable, the backend automatically falls back to:

- `backend_ai/data/history.json`

## Scripts

### Backend (`backend_ai/package.json`)

- `npm run dev` start with file watch
- `npm start` start normally

### Frontend (`frontend_ai/package.json`)

- `npm run dev` start Vite dev server
- `npm run build` type-check + production build
- `npm run preview` preview production build
- `npm run lint` run ESLint

## Testing Notes

The backend includes utility test scripts (for manual API/engine validation):

- `backend_ai/test_engine.js`
- `backend_ai/tmp_test.js`

Run only when backend is up and endpoint assumptions match your local config.

## Additional Docs

- `frontend_ai/README.md` frontend-specific setup and architecture notes
- `prd.md` product requirements
- `CitySketch_Logic_Guide.html` generator logic reference

## Maintainers

- Rahul S: https://github.com/rahulsp19
- Pranav: https://github.com/pranav-pachn
- Siddarth: https://github.com/lalithsiddartha69

For issues, include reproduction steps, expected/actual behavior, logs, and environment details.
