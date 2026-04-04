# CitySketch

CitySketch is an AI-assisted urban layout tool that converts natural language prompts into city plans and visualizes them in multiple modes:

- 2D zoning grid
- 3D scene preview
- Blueprint/floor-plan renderer
- Code/JSON layout view

## Repository Structure

- `backend_ai/`: Express API for generation, history, health checks, and auth integration
- `frontend_ai/`: React + Vite + TypeScript client app
- `prd.md`: product requirements and design notes
- `.env` (local only): runtime configuration (do not commit secrets)

## Source Code

The full source code is included in this repository:

- Backend source: `backend_ai/server.js`, `backend_ai/routes/*`, `backend_ai/utils/*`
- Frontend source: `frontend_ai/src/*`

## Documentation

This `README.md` is the main project documentation.

Additional references:

- `prd.md`: product scope, UI and architecture intent
- `frontend_ai/README.md`: frontend scaffold notes (Vite template)

## Setup Instructions

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Clone and install dependencies

```bash
git clone https://github.com/rahulsp19/CitySketch1.git
cd CitySketch1

cd backend_ai
npm install

cd ../frontend_ai
npm install
```

### 2. Configure environment

Create a root `.env` file from `.env.example` and fill in valid values.

Required variables include:

- `PORT`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- One or more AI provider keys:
  - `OPENROUTER_API_KEY` (or `OPENROUTER_API_KEYS`)
  - `GEMINI_API_KEY` (or `GEMINI_API_KEYS`)
  - `GROQ_API_KEY` (or `GROQ_API_KEYS`)
- `GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_DEV_API_TARGET`

### 3. Run backend

```bash
cd backend_ai
npm run dev
```

Backend default URL: `http://localhost:3001`

### 4. Run frontend

```bash
cd frontend_ai
npm run dev
```

Frontend default URL: `http://localhost:5173`

The frontend proxies `/api/*` to `VITE_DEV_API_TARGET`.

### 5. Production build

```bash
cd frontend_ai
npm run build
npm run preview
```

## Project Details

### Core Features

- Prompt-driven city layout generation (`POST /api/generate`)
- History persistence with Supabase + local fallback (`/api/history`)
- Google auth verification endpoint (`POST /api/auth/google`)
- Health endpoint (`GET /api/health`)
- Multi-view workspace:
  - 2D interactive grid
  - 3D scene and snapshot export
  - Blueprint export with selectable scale (2x, 3x, 4x, 5x Large Print)
  - JSON/code view

### Tech Stack

- Frontend: React, TypeScript, Vite, Zustand, Three.js, React Three Fiber, Tailwind
- Backend: Node.js, Express, Supabase, OpenAI-compatible providers, Groq

## Point of Contact
Primary maintainer: **Rahul S,Pranav,Siddarth**

- GitHub: https://github.com/rahulsp19
- GitHub: https://github.com/pranav-pachn
- GitHub: https://github.com/lalithsiddartha69
- Repository issues: https://github.com/rahulsp19/CitySketch1/issues


For support, open an issue with:

- Reproduction steps
- Expected vs actual behavior
- Console logs/screenshots
- Environment details (OS, Node version)
