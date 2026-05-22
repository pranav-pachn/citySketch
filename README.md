# CitySketch — AI Urban Design Studio

Fast, opinionated urban-design prototyping from plain-English prompts. Generate, evaluate, compare, and export city layouts (2D + 3D) for rapid ideation, teaching, and demos.

---

Why this README: focused, practical instructions for contributors and maintainers — install, run, test, and extend the system quickly.

Key folders: [backend_ai](backend_ai) · [frontend_ai](frontend_ai)

---

## Quick Start — Local (2 minutes)

Prerequisites
- Node.js 18+ and npm
- Git

Install

```bash
git clone <repo-url>
cd Sketch.ai

# Backend
cd backend_ai
npm install

# Frontend (new terminal)
cd ../frontend_ai
npm install
```

Environment
- Copy env template(s):

```bash
# backend
cp backend_ai/.env.example backend_ai/.env || echo "Create backend_ai/.env"

# frontend
cp frontend_ai/.env.example frontend_ai/.env || echo "Create frontend_ai/.env"
```

Run (development)

```bash
# terminal 1 — backend (Express)
cd backend_ai
npm run dev

# terminal 2 — frontend (Vite)
cd frontend_ai
npm run dev
```

Defaults: frontend → http://localhost:5173, backend → http://localhost:3001

Build & Preview

```bash
cd frontend_ai
npm run build
npm run preview
```

Testing (backend)

```bash
cd backend_ai
npm test
```

---

## What it is
- Natural-language → structured JSON parser for urban requirements
- Grid-based layout engine that places zones, roads, and support uses
- Explainability + scoring (walkability, traffic, sustainability)
- Multi-view UI: 2D canvas, 3D low-poly Three.js scene, blueprint exports, JSON export
- Optional map-grounded mode using OpenStreetMap geometry

---

## Highlights & Features
- Prompt-driven generation and regeneration (multiple proposals)
- Per-cell explanations and evaluation metrics
- Exports: PNG (html2canvas), JSON, PDF reports
- Map import (Overpass/OSM) → rasterize to generation grid

---

## Architecture (short)
- backend_ai — Node.js + Express: API, prompt parsing, generator pipeline, history store (Supabase optional)
- frontend_ai — Vite + React + Three.js: UI, canvas, 3D scene, export tools
- Data: `backend_ai/data/history.json` fallback when Supabase not configured

See key entry points:
- `backend_ai/src/controllers/generateController.js`
- `backend_ai/src/services/generator/CityGenerator.js`
- `frontend_ai/src/widgets/Canvas.tsx` and `frontend_ai/src/widgets/Scene3D.tsx`

---

## Project layout (short)

```
./
├─ backend_ai/        # API + generation engine
├─ frontend_ai/       # Vite + React + Three.js app
├─ data/              # sample data + history
└─ README.md
```

---

## Contributing
- Open an issue describing the problem or proposed change.
- For PRs: target `main`, keep changes focused, include a short test or manual verification steps.
- Add CI for lint/type-check where appropriate; see `frontend_ai/package.json` for lint/build scripts.

Suggested follow-ups (I can help): add `CONTRIBUTING.md`, add a prompt-gallery, add CI workflow for lint & type-check.

---

## Maintainers & Contacts
- Rahul S — https://github.com/rahulsp19
- Pranav — https://github.com/pranav-pachn
- Siddarth — https://github.com/lalithsiddartha69

For quick questions, open an issue or tag a maintainer in PRs.

---

## License
This repository uses the ISC license (check top-level license or `package.json`).

---

If you want, I can also:
- add a short `CONTRIBUTING.md` and PR template,
- create a compact example prompt gallery with screenshots and runnable demo cases.

---

EOF

```text
Create a 15-acre mixed-use smart district with commercial zones, parks, schools, and low traffic residential pockets
```

```text
Plan a compact city near a lake with walkable housing, healthcare, and strong green coverage
```

***

## Scoring logic

A simple and explainable scoring model works best for hackathons.

```text
Sustainability = park_cells / total_cells
Traffic = function(road coverage, road density, connectivity)
Walkability = inverse of average distance between residential and key amenities
Density = residential_cells / buildable_cells
```

These formulas do not aim to replace real urban planning simulation. They are meant to provide a meaningful and intuitive comparison layer.

***

## Demo script

1. Enter a prompt such as:
   `Design a 10 acre eco friendly city with parks, hospitals, low traffic and commercial zones`
2. Click **Generate**.
3. Show the 2D layout first.
4. Switch to the 3D view.
5. Open the score panel.
6. Click a zone and show the explanation.
7. Optionally import a map area and regenerate using real geography.

### Strong pitch line

> “While CAD tools help you draw cities, CitySketch helps you design intelligent cities instantly.”

***

## Getting started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Optional API keys:
  - OpenAI API key
  - Geoapify API key

### Installation

```bash
git clone https://github.com/your-username/CitySketch-X-Lite.git
cd CitySketch-X-Lite
npm install
```

### Run frontend

```bash
npm run dev
```

### Run backend

```bash
npm run server
```

### Environment variables

Create a `.env` file:

```env
VITE_GEOAPIFY_API_KEY=your_geoapify_key
OPENAI_API_KEY=your_openai_key
PORT=5000
```

***

## Build priorities for a hackathon

If time is limited, build in this order:

1. Prompt input
2. Parser → JSON
3. 2D layout engine
4. Score panel
5. Explainability panel
6. 3D visualization
7. Map-based simulation

This order ensures a solid demo even if advanced features are partially complete.

***

## Team roles

| Role | Focus |
|---|---|
| Member 1 | Prompt parsing / AI / input normalization |
| Member 2 | Core layout engine and zone placement |
| Member 3 | 2D + 3D rendering |
| Member 4 | UI, scoring, explainability, pitch |

***

## Roadmap

### Short-term
- Better prompt parsing
- More zone types
- Cleaner 3D navigation
- Better map import UX

### Mid-term
- Editable layouts after generation
- Save / export JSON layouts
- Blueprint mode
- Comparative layout scoring

### Long-term
- GIS integration
- Real zoning constraints
- Infra optimization
- Multi-objective planning support
- Planning assistant for campuses, districts, and smart villages

***

## Design principles

- Keep the generation logic simple and explainable.
- Prefer a working demo over perfect realism.
- Make every screen visually understandable within a few seconds.
- Ensure every generated layout can justify itself.
- Use constraints to make the system feel intelligent, not random.

***

## Potential judge questions this project answers well

- **Why is this useful?** → It makes early-stage urban layout design accessible.
- **What is innovative?** → It combines prompt-based planning, explainability, scoring, and optional real-world map constraints.
- **What is technically strong?** → NLP + procedural generation + visualization + geospatial ingestion.
- **Can it scale?** → Yes, into campus planning, district redesign, GIS-assisted planning, and smart-village planning.

***

## Contributing

Contributions are welcome in the following areas:

- layout heuristics,
- scoring models,
- geospatial conversion,
- UI/UX improvements,
- map-based simulation,
- 3D rendering polish.

***

## License

This project is intended for hackathon, educational, and prototype use. Add your preferred open-source license here if publishing publicly.

***

## One-line description

**CitySketch X Lite** transforms plain-English city requirements into intelligent, explainable 2D and 3D city layouts with scoring and optional real-world map constraints.