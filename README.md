# CitySketch — AI Urban Design Studio

Fast, opinionated urban design from plain-English prompts — generate, evaluate, compare, and export city layouts (2D + 3D). Built as a pragmatic toolkit for prototyping planning ideas, teaching, and early product exploration.

<p align="center">
  <img alt="CitySketch screenshot" src=".github/screenshot-placeholder.png" width="720" />
</p>

---

**Why CitySketch**
- Rapidly explore design alternatives from natural-language prompts.
- Built-in explainability and scoring (walkability, traffic, sustainability).
- Compare multiple proposals side-by-side and export results (PNG / JSON / PDF).
- Map-grounded mode: import OSM geometry and respect real roads/water.

---

**Quick links**
- Code: [backend_ai](backend_ai) and [frontend_ai](frontend_ai)
- Run locally: see Quick Start

---

## Quick Start
1. Clone and install dependencies:

```bash
git clone <repo-url>
cd Sketch.ai
# backend
cd backend_ai
npm install
# frontend (new terminal)
cd ../frontend_ai
npm install
```

2. Copy env template and set required keys:

```bash
cp .env.example .env
# edit .env to add SUPABASE / AI keys / GOOGLE_CLIENT_ID etc.
```

3. Run (dev):

```bash
# terminal 1
cd backend_ai
npm run dev

# terminal 2
cd frontend_ai
npm run dev
```

Default: frontend http://localhost:5173 · backend http://localhost:3001

---

## Key Concepts (TL;DR)
- Prompt → Parser → `CityGenerator` → layout grid (NxN) → scoring + explainability → multi-view UI.
- The backend supports multiple LLM providers (OpenRouter/Gemini/Groq) with safe fallbacks.
- History persists to Supabase when configured, otherwise to `backend_ai/data/history.json`.

---

## Features (Productized)
- Generate: turn a prompt into a complete layout and evaluation report.
- Regenerate: produce alternative layouts from the same prompt and compare (Compare view).
- Export: download PNG snapshots of 2D/3D/Blueprint views, export structured JSON, or generate a PDF report with metrics and snapshot.
- Manual edits: tweak cells, save snapshots, and re-evaluate.
- Map import: rasterize OSM geometry into the generation grid and re-run the engine.

---

## Example Prompt

> "Design a 10-acre eco-friendly town with a central park, one hospital, balanced traffic, and a small commercial district."

The system extracts intent, computes a grid size, and returns a structured layout plus evaluation data.

---

## API (most-used)
- POST `/api/generate` — { prompt, saveToHistory? }
- POST `/api/generate-from-map` — { bbox, locationName, gridSize? }
- GET `/api/history` — list saved snapshots
- POST `/api/history` — save a snapshot

Refer to `backend_ai/src/routes` for implementation details.

---

## Files & Where to Look
- `backend_ai/src/controllers/generateController.js` — prompt parsing + generation pipeline
- `backend_ai/src/services/generator/CityGenerator.js` — core layout algorithm
- `frontend_ai/src/entities/store` — app state, generate/regenerate flows
- `frontend_ai/src/widgets` — `Canvas`, `Grid2D`, `Scene3D`, `WorkspaceHeader` (export menu + regenerate)

---

## Design & UX Notes
- Regenerate creates a temporary history snapshot so users can compare the original and alternative layouts in the Compare view.
- Exports are intentionally view-aware: 2D & Blueprint use `html2canvas`, 3D uses the WebGL canvas, and JSON export includes layout + evaluation.

---

## Roadmap & Suggestions
Short-term (high impact):
- Add example prompt gallery and one-click demo cases.
- Allow optional persistence of regenerated proposals to history.
- Add CI for lint + type-check and a small E2E smoke test for generate → export flows.

Mid-term:
- Add user accounts and project spaces in Supabase.
- Fine-grained simulation (traffic modeling) and export to common GIS formats.

---

## Contributing
- Open an issue with clear steps and expected behavior.
- For PRs: target `main`, include a focused change, and add a brief test or manual verification note.

---

## Maintainers
- Rahul S — https://github.com/rahulsp19
- Pranav — https://github.com/pranav-pachn
- Siddarth — https://github.com/lalithsiddartha69


---

If you want, I will:
- add a small example prompt gallery with screenshots, or
- add a `CONTRIBUTING.md` and CI workflow for `frontend_ai`.

CitySketch X Lite is a hackathon-ready urban planning prototype that converts natural-language requirements into structured layout decisions, visual maps, and evaluation metrics. Instead of forcing users to work in CAD or GIS tools first, it lets them describe a city concept in plain English and instantly see how that idea could translate into zones, roads, and urban trade-offs.

The system combines a text parser, a rule-based layout engine, a 2D grid renderer, a lightweight Three.js 3D view, and a score + explanation layer. It can also support **map-based simulation**, where real roads and water bodies from OpenStreetMap are projected into the generation grid before the layout engine fills the rest.

***

## Why this project exists

Designing a city layout usually needs specialized tools, domain expertise, and a lot of time. That makes early-stage ideation difficult for students, startup teams, and non-expert users who just want to explore a concept quickly.

CitySketch X Lite solves that by making city planning:

- **Fast** — type a prompt and get a layout in seconds.
- **Visual** — inspect the same city in 2D and 3D.
- **Explainable** — click a block to see why it was placed.
- **Evaluative** — compare layouts using sustainability, traffic, and walkability scores.
- **Extensible** — plug in map constraints, new zone types, or smarter generation rules later.

***

## Core workflow

```text
User Prompt
   ↓
AI / Rule Parser
   ↓
Structured JSON
   ↓
Layout Engine (Grid Logic)
   ↓
2D Map + 3D Visualization
   ↓
Scores + Explainability
```

### Example prompt

```text
Design a 10 acre eco friendly city with parks, hospitals, low traffic and commercial zones
```

### Example parsed structure

```json
{
  "zones": [
    { "type": "residential", "count": 10 },
    { "type": "park", "count": 4 },
    { "type": "hospital", "count": 2, "near_road": true },
    { "type": "commercial", "count": 3, "near_road": true }
  ],
  "constraints": {
    "traffic": "low",
    "density": "medium"
  },
  "flags": {
    "eco": true
  },
  "area_in_acres": 10,
  "grid_size": 25
}
```

***

## Key features

### 1. Natural-language smart input

Users describe a city or township in everyday language. The parser extracts:

- zone types,
- land size,
- density preference,
- sustainability flags,
- traffic constraints,
- optional smart-city attributes.

This can be powered by GPT or a rule-based keyword parser with strong fallback behavior.

### 2. 2D layout engine

The city is generated on a grid (for example 20×20 or 25×25). Each cell represents a land-use decision such as:

- residential,
- park,
- hospital,
- commercial,
- school,
- road,
- water.

Simple urban heuristics drive placement, such as parks near residential areas and hospitals near roads.

### 3. 3D visualization

The grid is converted into a lightweight Three.js scene with colored boxes. The purpose is not realism — it is clarity, spatial understanding, and demo impact.

### 4. Urban score panel

Generated layouts are evaluated using fast, explainable heuristic metrics:

- Sustainability score
- Traffic score
- Walkability score
- Density score

### 5. Explainability panel

Every meaningful block can explain itself:

- “Park placed near residential for accessibility.”
- “Hospital placed near main road for emergency access.”
- “Commercial zone aligned with road edge for visibility and access.”

### 6. Map-based simulation

Instead of generating a layout from scratch, the user can import a real-world area from a map. Roads and water bodies are fetched from OpenStreetMap and projected into the generation grid before the engine fills the remaining cells.

This enables “what if we redesigned this neighborhood?” style simulations.

***

## What makes it stand out

| Capability | Traditional concept sketch | CitySketch X Lite |
|---|---|---|
| Natural-language planning | Manual interpretation | Prompt → structured layout |
| 2D visualization | Usually manual | Auto-generated |
| 3D view | Requires extra modeling | Instant low-poly scene |
| Explainability | Rare | Built-in per block |
| Score system | Manual reasoning | Automated heuristic scoring |
| Real map grounding | Separate GIS workflow | Optional map import mode |

***

## Tech stack

### Frontend
- React
- Tailwind CSS
- HTML Canvas or CSS Grid for 2D map
- Three.js for 3D visualization
- Leaflet / React-Leaflet for map mode

### Backend
- Node.js / Express (optional but recommended for map mode and external API calls)

### Data / APIs
- OpenAI API or rule-based parser for prompt interpretation
- Geoapify for tiles and geocoding
- Overpass API / OpenStreetMap for real-world road and water data

***

## Project structure

```text
CitySketch-X-Lite/
├── src/
│   ├── components/
│   │   ├── PromptInput.jsx
│   │   ├── Map2DCanvas.jsx
│   │   ├── View3D.jsx
│   │   ├── ScorePanel.jsx
│   │   ├── ExplainPanel.jsx
│   │   └── MapImportModal.jsx
│   ├── engine/
│   │   ├── parser.js
│   │   ├── layoutEngine.js
│   │   ├── scoreEngine.js
│   │   ├── explainEngine.js
│   │   └── geoToGrid.js
│   ├── data/
│   │   └── templates.js
│   ├── App.jsx
│   └── main.jsx
├── server/
│   ├── api/
│   │   └── generate-from-map.js
│   └── server.js
├── public/
├── README.md
└── package.json
```

***

## How it works

## 1. Prompt parsing

The parser reads the user prompt and normalizes it into JSON. It should detect synonyms such as:

- `healthcare` → hospital
- `green spaces` → park
- `high density housing` → residential + density = high
- `balanced traffic` → road strategy = medium/balanced

## 2. Grid generation

The generator initializes an `N x N` array and places:

1. roads,
2. fixed constraints,
3. residential clusters,
4. support zones such as parks, hospitals, schools, and commercial areas,
5. fallback fill zones for unused cells.

## 3. Scoring

Once the grid is generated, the system computes fast evaluation metrics based on cell counts, adjacency, and distance.

## 4. Explainability

Each cell stores a short explanation string derived from its local context. That text appears in the UI when the user clicks on the block.

## 5. 3D conversion

Each 2D cell becomes a Three.js cube with a color and height that reflect the zone type.

***

## Map-based simulation flow

```text
User clicks “Import from Map”
        ↓
Fullscreen map opens
        ↓
User searches / locates / zooms to target site
        ↓
Blue crosshair defines selected area
        ↓
Bounding box sent to backend
        ↓
Overpass API fetches roads + water from OSM
        ↓
GPS geometry rasterized to grid
        ↓
City generator fills remaining cells
        ↓
Result shown in 2D / 3D / Blueprint views
```

### Why this matters

This turns CitySketch from a generic generator into a location-aware planning prototype. If a river, lake, or arterial road exists in the selected site, the layout respects that geography instead of inventing it.

***

## Sample prompts

```text
Design a 5-acre eco-friendly township with park, hospital, and low traffic
```

```text
Build a smart urban area with healthcare, green spaces, high density housing and balanced traffic
```

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