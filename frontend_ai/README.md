# CitySketch Frontend

Frontend application for CitySketch, built with React + TypeScript + Vite.

## Core Responsibilities

- Landing, login, and workspace routes
- Prompt submission and map-context submission to backend APIs
- Multi-view city visualization (2D, 3D, blueprint, code)
- Layout editing and history interactions
- Google OAuth client flow

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Zustand (app state)
- React Router
- React Three Fiber / Three.js
- Tailwind CSS + Radix UI primitives

## Routing

- `/` landing page
- `/login` login and auth page
- `/app` main workspace

Defined in `src/App.tsx`.

## API Configuration

Client URL construction is handled in `src/lib/api.ts`:

- `VITE_API_BASE_URL`:
  - if set, requests become `${VITE_API_BASE_URL}/api/...`
  - if empty, requests stay relative (`/api/...`)

Development proxy is configured in `vite.config.ts`:

- `VITE_DEV_API_TARGET` (default: `http://localhost:3001`)
- `/api/*` is proxied to that target in dev mode

## Required Environment Variables

These are read from the root `.env` (Vite `envDir` points to `../`):

- `VITE_GOOGLE_CLIENT_ID` for `GoogleOAuthProvider`
- `VITE_API_BASE_URL` optional absolute API base
- `VITE_DEV_API_TARGET` dev proxy target

## Key Source Files

- `src/main.tsx` app bootstrap and Google provider
- `src/App.tsx` route definitions
- `src/Workspace.tsx` workspace shell and map import modal
- `src/store/useStore.ts` app state and API actions
- `src/components/` visual modules (grid, scene, blueprint, sidebar, etc.)
- `src/pages/` landing and login screens

## State + Actions

The main store (`src/store/useStore.ts`) includes:

- Prompt flow: `submitPrompt(saveToHistory?)`
- Map flow: `submitMapContext(bbox, locationName, gridSize?)`
- History flow: fetch/load/save/delete snapshots
- UI flow: selected cell, panel state, toasts, view mode, canvas maximize

## Available Scripts

- `npm run dev` start Vite dev server
- `npm run build` type-check + production build
- `npm run preview` preview build output
- `npm run lint` run ESLint

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Ensure backend is running (default `http://localhost:3001`).

3. Start frontend:

```bash
npm run dev
```

4. Open `http://localhost:5173`.

## Notes

- Map-based generation depends on backend route `POST /api/generate-from-map`.
- Google sign-in posts the ID token to backend `POST /api/auth/google` for verification.
