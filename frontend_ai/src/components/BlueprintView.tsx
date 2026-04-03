import { useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Download } from 'lucide-react'
import rough from 'roughjs'
import type { GridCell } from '../types'

/* ═══════ Room Templates by SUBTYPE ═══════ */
interface Room {
  x: number; y: number; w: number; h: number
  label: string
  hatch?: boolean
  diagonal?: boolean
}

/* ── Commercial Subtypes ── */
const COMMERCIAL_PLANS: Record<string, Room[]> = {
  waterfront_dining: [
    { x: 0, y: 0, w: 200, h: 50, label: 'riverside terrace' },
    { x: 0, y: 50, w: 120, h: 60, label: 'main dining' },
    { x: 120, y: 50, w: 80, h: 60, label: 'bar / lounge' },
    { x: 0, y: 110, w: 80, h: 50, label: 'kitchen', hatch: true },
    { x: 80, y: 110, w: 60, h: 50, label: 'cold store', hatch: true },
    { x: 140, y: 110, w: 60, h: 50, label: 'staff / WC' },
  ],
  office_tower: [
    { x: 0, y: 0, w: 100, h: 50, label: 'executive suite' },
    { x: 100, y: 0, w: 100, h: 50, label: 'board room' },
    { x: 0, y: 50, w: 200, h: 60, label: 'open plan workspace' },
    { x: 0, y: 110, w: 80, h: 50, label: 'server room', hatch: true },
    { x: 80, y: 110, w: 60, h: 50, label: 'elevator core', hatch: true },
    { x: 140, y: 110, w: 60, h: 50, label: 'lobby' },
  ],
  boutique_retail: [
    { x: 0, y: 0, w: 140, h: 70, label: 'showroom' },
    { x: 140, y: 0, w: 60, h: 70, label: 'fitting rooms', diagonal: true },
    { x: 0, y: 70, w: 100, h: 50, label: 'cashier + display' },
    { x: 100, y: 70, w: 100, h: 50, label: 'stockroom', hatch: true },
    { x: 0, y: 120, w: 200, h: 30, label: 'storefront gallery' },
  ],
  warehouse_outlet: [
    { x: 0, y: 0, w: 140, h: 100, label: 'warehouse floor', hatch: true },
    { x: 140, y: 0, w: 60, h: 60, label: 'office' },
    { x: 140, y: 60, w: 60, h: 40, label: 'break room' },
    { x: 0, y: 100, w: 120, h: 50, label: 'loading bay', hatch: true },
    { x: 120, y: 100, w: 80, h: 50, label: 'checkout area' },
  ],
  office_building: [
    { x: 0, y: 0, w: 100, h: 60, label: 'reception' },
    { x: 100, y: 0, w: 100, h: 60, label: 'meeting room' },
    { x: 0, y: 60, w: 130, h: 50, label: 'work area' },
    { x: 130, y: 60, w: 70, h: 50, label: 'manager office' },
    { x: 0, y: 110, w: 80, h: 40, label: 'pantry' },
    { x: 80, y: 110, w: 60, h: 40, label: 'restrooms', hatch: true },
    { x: 140, y: 110, w: 60, h: 40, label: 'utility', hatch: true },
  ],
}

/* ── Residential Subtypes ── */
const RESIDENTIAL_PLANS: Record<string, Room[]> = {
  waterfront_apartment: [
    { x: 0, y: 0, w: 130, h: 80, label: 'living + balcony view' },
    { x: 130, y: 0, w: 70, h: 40, label: 'bath', hatch: true },
    { x: 130, y: 40, w: 70, h: 40, label: 'walk-in closet' },
    { x: 0, y: 80, w: 100, h: 70, label: 'master bed', diagonal: true },
    { x: 100, y: 80, w: 100, h: 70, label: 'kitchen + dining' },
  ],
  garden_villa: [
    { x: 0, y: 0, w: 100, h: 90, label: 'living' },
    { x: 100, y: 0, w: 110, h: 50, label: 'sunroom / conservatory' },
    { x: 100, y: 50, w: 60, h: 40, label: 'bath', hatch: true },
    { x: 160, y: 50, w: 50, h: 40, label: 'laundry', hatch: true },
    { x: 0, y: 90, w: 80, h: 70, label: 'master bed', diagonal: true },
    { x: 80, y: 90, w: 60, h: 70, label: 'bed #2', diagonal: true },
    { x: 140, y: 90, w: 70, h: 70, label: 'kitchen' },
  ],
  urban_apartment: [
    { x: 0, y: 0, w: 90, h: 70, label: 'studio living' },
    { x: 90, y: 0, w: 70, h: 70, label: 'kitchenette' },
    { x: 160, y: 0, w: 40, h: 35, label: 'WC', hatch: true },
    { x: 160, y: 35, w: 40, h: 35, label: 'entry' },
    { x: 0, y: 70, w: 100, h: 60, label: 'bedroom', diagonal: true },
    { x: 100, y: 70, w: 100, h: 60, label: 'balcony / terrace' },
  ],
  suburban_house: [
    { x: 0, y: 0, w: 90, h: 80, label: 'garage', hatch: true },
    { x: 90, y: 0, w: 120, h: 80, label: 'living room' },
    { x: 0, y: 80, w: 70, h: 70, label: 'kitchen' },
    { x: 70, y: 80, w: 50, h: 70, label: 'dining' },
    { x: 120, y: 80, w: 90, h: 35, label: 'bed #1', diagonal: true },
    { x: 120, y: 115, w: 90, h: 35, label: 'bed #2', diagonal: true },
    { x: 0, y: 150, w: 210, h: 20, label: 'porch' },
  ],
  townhouse: [
    { x: 0, y: 0, w: 100, h: 80, label: 'living' },
    { x: 100, y: 0, w: 80, h: 40, label: 'kitchen' },
    { x: 100, y: 40, w: 80, h: 40, label: 'dining' },
    { x: 0, y: 80, w: 90, h: 60, label: 'bed #1', diagonal: true },
    { x: 90, y: 80, w: 90, h: 60, label: 'bed #2', diagonal: true },
    { x: 0, y: 140, w: 50, h: 30, label: 'bath', hatch: true },
    { x: 50, y: 140, w: 50, h: 30, label: 'stairs' },
  ],
  family_home: [
    { x: 0, y: 0, w: 120, h: 80, label: 'living room' },
    { x: 120, y: 0, w: 80, h: 40, label: 'home office' },
    { x: 120, y: 40, w: 80, h: 40, label: 'laundry', hatch: true },
    { x: 0, y: 80, w: 70, h: 60, label: 'kitchen' },
    { x: 70, y: 80, w: 60, h: 60, label: 'dining' },
    { x: 130, y: 80, w: 70, h: 60, label: 'bed #1', diagonal: true },
    { x: 0, y: 140, w: 100, h: 30, label: 'patio' },
    { x: 100, y: 140, w: 50, h: 30, label: 'bath', hatch: true },
  ],
}

/* ── Industrial Subtypes ── */
const INDUSTRIAL_PLANS: Record<string, Room[]> = {
  port_facility: [
    { x: 0, y: 0, w: 200, h: 40, label: 'dock / quayside', hatch: true },
    { x: 0, y: 40, w: 130, h: 80, label: 'cargo warehouse', hatch: true },
    { x: 130, y: 40, w: 70, h: 40, label: 'customs office' },
    { x: 130, y: 80, w: 70, h: 40, label: 'harbormaster' },
    { x: 0, y: 120, w: 100, h: 40, label: 'container yard', hatch: true },
    { x: 100, y: 120, w: 100, h: 40, label: 'vehicle staging' },
  ],
  logistics_hub: [
    { x: 0, y: 0, w: 150, h: 90, label: 'sorting center', hatch: true },
    { x: 150, y: 0, w: 60, h: 45, label: 'dispatch office' },
    { x: 150, y: 45, w: 60, h: 45, label: 'driver lounge' },
    { x: 0, y: 90, w: 120, h: 50, label: 'loading bays', hatch: true },
    { x: 120, y: 90, w: 90, h: 50, label: 'parking' },
  ],
  manufacturing_plant: [
    { x: 0, y: 0, w: 150, h: 100, label: 'assembly line', hatch: true },
    { x: 150, y: 0, w: 60, h: 50, label: 'quality control' },
    { x: 150, y: 50, w: 60, h: 50, label: 'admin office' },
    { x: 0, y: 100, w: 100, h: 50, label: 'raw materials', hatch: true },
    { x: 100, y: 100, w: 50, h: 50, label: 'mech. room', hatch: true },
    { x: 150, y: 100, w: 60, h: 50, label: 'break room' },
  ],
  factory: [
    { x: 0, y: 0, w: 150, h: 100, label: 'factory floor', hatch: true },
    { x: 150, y: 0, w: 60, h: 50, label: 'office' },
    { x: 150, y: 50, w: 60, h: 50, label: 'control room' },
    { x: 0, y: 100, w: 100, h: 50, label: 'loading dock', hatch: true },
    { x: 100, y: 100, w: 60, h: 50, label: 'storage' },
    { x: 160, y: 100, w: 50, h: 50, label: 'mech.', hatch: true },
  ],
}

/* ── Park Subtypes ── */
const PARK_PLANS: Record<string, Room[]> = {
  waterfront_promenade: [
    { x: 0, y: 0, w: 200, h: 40, label: 'riverwalk boardwalk' },
    { x: 0, y: 40, w: 80, h: 60, label: 'viewing deck' },
    { x: 80, y: 40, w: 60, h: 60, label: 'café kiosk' },
    { x: 140, y: 40, w: 60, h: 60, label: 'boat landing', hatch: true },
    { x: 0, y: 100, w: 200, h: 40, label: 'landscaped garden strip', diagonal: true },
  ],
  central_plaza: [
    { x: 0, y: 0, w: 200, h: 60, label: 'central fountain / plaza' },
    { x: 0, y: 60, w: 100, h: 50, label: 'amphitheater seating' },
    { x: 100, y: 60, w: 100, h: 50, label: 'public art installation' },
    { x: 0, y: 110, w: 70, h: 40, label: 'restrooms', hatch: true },
    { x: 70, y: 110, w: 130, h: 40, label: 'pedestrian corridor' },
  ],
  nature_reserve: [
    { x: 0, y: 0, w: 120, h: 80, label: 'forest walk', diagonal: true },
    { x: 120, y: 0, w: 80, h: 80, label: 'bird hide' },
    { x: 0, y: 80, w: 80, h: 60, label: 'wetland pond', hatch: true },
    { x: 80, y: 80, w: 120, h: 60, label: 'meadow trail' },
    { x: 0, y: 140, w: 200, h: 20, label: 'perimeter fence' },
  ],
  community_garden: [
    { x: 0, y: 0, w: 80, h: 80, label: 'garden plots', diagonal: true },
    { x: 80, y: 0, w: 70, h: 50, label: 'playground' },
    { x: 80, y: 50, w: 70, h: 30, label: 'benches' },
    { x: 150, y: 0, w: 60, h: 80, label: 'pond', hatch: true },
    { x: 0, y: 80, w: 210, h: 30, label: 'walking path' },
    { x: 0, y: 110, w: 100, h: 50, label: 'open lawn' },
    { x: 100, y: 110, w: 50, h: 50, label: 'gazebo' },
    { x: 150, y: 80, w: 60, h: 80, label: 'trees', diagonal: true },
  ],
}

/* ═══════ Lookup ═══════ */
function getRoomsForCell(cell: GridCell): Room[] {
  const subtype = cell.subtype || ''

  switch (cell.type) {
    case 'commercial':
      return COMMERCIAL_PLANS[subtype] || COMMERCIAL_PLANS['office_building']
    case 'residential':
      return RESIDENTIAL_PLANS[subtype] || RESIDENTIAL_PLANS['family_home']
    case 'industrial':
      return INDUSTRIAL_PLANS[subtype] || INDUSTRIAL_PLANS['factory']
    case 'park':
      return PARK_PLANS[subtype] || PARK_PLANS['community_garden']
    default:
      return []
  }
}

/* ═══════ Zone Labels ═══════ */
const SUBTYPE_TITLES: Record<string, string> = {
  // Commercial
  waterfront_dining: 'WATERFRONT RESTAURANT — FLOOR PLAN',
  office_tower: 'OFFICE TOWER — TYPICAL FLOOR',
  boutique_retail: 'BOUTIQUE RETAIL — FLOOR PLAN',
  warehouse_outlet: 'WAREHOUSE OUTLET — FLOOR PLAN',
  office_building: 'OFFICE BUILDING — FLOOR PLAN',
  // Residential
  waterfront_apartment: 'WATERFRONT APARTMENT — UNIT PLAN',
  garden_villa: 'GARDEN VILLA — FLOOR PLAN',
  urban_apartment: 'URBAN STUDIO — UNIT PLAN',
  suburban_house: 'SUBURBAN HOUSE — FLOOR PLAN',
  townhouse: 'TOWNHOUSE — FLOOR PLAN',
  family_home: 'FAMILY HOME — FLOOR PLAN',
  // Industrial
  port_facility: 'PORT FACILITY — SITE PLAN',
  logistics_hub: 'LOGISTICS HUB — FLOOR PLAN',
  manufacturing_plant: 'MANUFACTURING PLANT — FLOOR PLAN',
  factory: 'FACTORY — FLOOR PLAN',
  // Park
  waterfront_promenade: 'WATERFRONT PROMENADE — SITE PLAN',
  central_plaza: 'CENTRAL PLAZA — SITE PLAN',
  nature_reserve: 'NATURE RESERVE — SITE PLAN',
  community_garden: 'COMMUNITY GARDEN — SITE PLAN',
}

const ZONE_FALLBACK_TITLES: Record<string, string> = {
  residential: 'RESIDENTIAL UNIT — FLOOR PLAN',
  commercial: 'COMMERCIAL SPACE — FLOOR PLAN',
  industrial: 'INDUSTRIAL FACILITY — FLOOR PLAN',
  park: 'PARK — SITE PLAN',
  road: 'ROAD SECTION',
  water: 'WATER BODY',
  empty: 'UNDEVELOPED PLOT',
}

/* ═══════ Blueprint Renderer ═══════ */
function drawBlueprint(
  canvas: HTMLCanvasElement,
  cell: GridCell | null,
  layoutData: GridCell[][] | null
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const W = rect.width
  const H = rect.height

  // Paper background
  ctx.fillStyle = '#fefcf8'
  ctx.fillRect(0, 0, W, H)

  // Subtle paper texture
  ctx.globalAlpha = 0.03
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * W
    const y = Math.random() * H
    ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#a0937d'
    ctx.fillRect(x, y, 1, 1)
  }
  ctx.globalAlpha = 1

  // Grid dots (engineering paper)
  ctx.fillStyle = '#d4cfc7'
  for (let x = 20; x < W; x += 20) {
    for (let y = 20; y < H; y += 20) {
      ctx.beginPath()
      ctx.arc(x, y, 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const rc = rough.canvas(canvas)

  if (!cell || cell.type === 'road' || cell.type === 'water' || cell.type === 'empty') {
    drawCityOverview(ctx, rc, W, H, layoutData)
    return
  }

  const rooms = getRoomsForCell(cell)
  if (rooms.length === 0) return

  // Calculate scale to fit
  const maxRoomX = Math.max(...rooms.map(r => r.x + r.w))
  const maxRoomY = Math.max(...rooms.map(r => r.y + r.h))
  const padding = 80
  const scaleX = (W - padding * 2) / maxRoomX
  const scaleY = (H - padding * 2.5) / maxRoomY
  const scale = Math.min(scaleX, scaleY, 3)
  const offsetX = (W - maxRoomX * scale) / 2
  const offsetY = (H - maxRoomY * scale) / 2 + 20

  // Title
  const title = SUBTYPE_TITLES[cell.subtype || ''] || ZONE_FALLBACK_TITLES[cell.type] || 'FLOOR PLAN'
  ctx.font = '11px "Courier New", monospace'
  ctx.fillStyle = '#5c4a3a'
  ctx.textAlign = 'center'
  ctx.fillText(title, W / 2, 30)

  // Subtitle with subtype
  const subtypeLabel = (cell.subtype || cell.type).replace(/_/g, ' ').toUpperCase()
  ctx.font = '9px "Courier New", monospace'
  ctx.fillStyle = '#8b7d6b'
  ctx.fillText(`SECTOR ${cell.x}-${cell.y}  ·  TYPE: ${subtypeLabel}  ·  SCALE 1:${Math.round(100/scale)}`, W / 2, 45)

  // Draw rooms
  rooms.forEach((room) => {
    const rx = offsetX + room.x * scale
    const ry = offsetY + room.y * scale
    const rw = room.w * scale
    const rh = room.h * scale

    // Room outline (hand-drawn)
    rc.rectangle(rx, ry, rw, rh, {
      stroke: '#4a3728',
      strokeWidth: 1.5,
      roughness: 1.2,
      bowing: 0.8,
    })

    // Hatching for utility/wet rooms
    if (room.hatch) {
      const spacing = 8
      for (let i = 0; i < rw + rh; i += spacing) {
        const x1 = rx + Math.min(i, rw)
        const y1 = ry + Math.max(0, i - rw)
        const x2 = rx + Math.max(0, i - rh)
        const y2 = ry + Math.min(i, rh)
        rc.line(x1, y1, x2, y2, { stroke: '#9b8b7a', strokeWidth: 0.5, roughness: 0.8 })
      }
    }

    // Diagonal cross for bedrooms / garden areas
    if (room.diagonal) {
      rc.line(rx + 4, ry + 4, rx + rw - 4, ry + rh - 4, { stroke: '#b8a898', strokeWidth: 0.5, roughness: 1.5 })
      rc.line(rx + rw - 4, ry + 4, rx + 4, ry + rh - 4, { stroke: '#b8a898', strokeWidth: 0.5, roughness: 1.5 })
    }

    // Room label
    ctx.font = `${Math.min(11, rw / 7)}px "Courier New", monospace`
    ctx.fillStyle = '#5c4a3a'
    ctx.textAlign = 'center'
    ctx.fillText(room.label, rx + rw / 2, ry + rh / 2 + 4)
  })

  // Outer wall (heavier)
  rc.rectangle(offsetX, offsetY, maxRoomX * scale, maxRoomY * scale, {
    stroke: '#2d1f14', strokeWidth: 2.5, roughness: 0.8, bowing: 0.5,
  })

  // Dimension lines
  drawDimensionLine(ctx, rc, offsetX, offsetY - 20, offsetX + maxRoomX * scale, offsetY - 20, `${Math.round(maxRoomX / 10)}m`)
  drawDimensionLine(ctx, rc, offsetX - 25, offsetY, offsetX - 25, offsetY + maxRoomY * scale, `${Math.round(maxRoomY / 10)}m`, true)

  // North arrow
  drawNorthArrow(ctx, rc, W - 50, 70)

  // Stamps
  ctx.font = '7px "Courier New", monospace'
  ctx.fillStyle = '#a09080'
  ctx.textAlign = 'right'
  ctx.fillText(`DRG NO: SK-${cell.x}${cell.y}-${Date.now().toString(36).slice(-4).toUpperCase()}`, W - 20, H - 20)
  ctx.fillText('SKETCH.AI AUTOMATED DRAFTING', W - 20, H - 10)
}

/* ═══════ Dimension Lines ═══════ */
function drawDimensionLine(
  ctx: CanvasRenderingContext2D, rc: any,
  x1: number, y1: number, x2: number, y2: number,
  label: string, vertical = false
) {
  rc.line(x1, y1, x2, y2, { stroke: '#8b7d6b', strokeWidth: 0.8, roughness: 0.5 })
  if (vertical) {
    rc.line(x1 - 5, y1, x1 + 5, y1, { stroke: '#8b7d6b', strokeWidth: 0.8 })
    rc.line(x1 - 5, y2, x1 + 5, y2, { stroke: '#8b7d6b', strokeWidth: 0.8 })
  } else {
    rc.line(x1, y1 - 5, x1, y1 + 5, { stroke: '#8b7d6b', strokeWidth: 0.8 })
    rc.line(x2, y1 - 5, x2, y1 + 5, { stroke: '#8b7d6b', strokeWidth: 0.8 })
  }
  ctx.save()
  ctx.font = '8px "Courier New", monospace'
  ctx.fillStyle = '#6b5d4d'
  ctx.textAlign = 'center'
  if (vertical) {
    ctx.translate((x1 + x2) / 2 - 8, (y1 + y2) / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(label, 0, 0)
  } else {
    ctx.fillText(label, (x1 + x2) / 2, y1 - 6)
  }
  ctx.restore()
}

/* ═══════ North Arrow ═══════ */
function drawNorthArrow(ctx: CanvasRenderingContext2D, rc: any, x: number, y: number) {
  rc.line(x, y + 20, x, y - 15, { stroke: '#5c4a3a', strokeWidth: 1.2, roughness: 0.8 })
  rc.line(x, y - 15, x - 5, y - 5, { stroke: '#5c4a3a', strokeWidth: 1.2, roughness: 0.8 })
  rc.line(x, y - 15, x + 5, y - 5, { stroke: '#5c4a3a', strokeWidth: 1.2, roughness: 0.8 })
  ctx.font = '10px "Courier New", monospace'
  ctx.fillStyle = '#5c4a3a'
  ctx.textAlign = 'center'
  ctx.fillText('N', x, y - 20)
}

/* ═══════ City Overview ═══════ */
function drawCityOverview(
  ctx: CanvasRenderingContext2D, rc: any,
  W: number, H: number, layoutData: GridCell[][] | null
) {
  if (!layoutData) return

  const rows = layoutData.length
  const cols = layoutData[0]?.length || 0
  const padding = 60
  const cellW = (W - padding * 2) / cols
  const cellH = (H - padding * 2.5) / rows
  const cellSize = Math.min(cellW, cellH, 50)
  const totalW = cols * cellSize
  const totalH = rows * cellSize
  const startX = (W - totalW) / 2
  const startY = (H - totalH) / 2 + 15

  ctx.font = '11px "Courier New", monospace'
  ctx.fillStyle = '#5c4a3a'
  ctx.textAlign = 'center'
  ctx.fillText('CITY MASTER PLAN — ZONING OVERVIEW', W / 2, 30)
  ctx.font = '9px "Courier New", monospace'
  ctx.fillStyle = '#8b7d6b'
  ctx.fillText(`${cols}×${rows} GRID  ·  SKETCH.AI AUTOMATED DRAFTING`, W / 2, 45)

  const ZONE_HATCHES: Record<string, { hatch: boolean; diagonal: boolean; density: number }> = {
    road: { hatch: false, diagonal: false, density: 0 },
    residential: { hatch: false, diagonal: true, density: 12 },
    commercial: { hatch: true, diagonal: false, density: 8 },
    industrial: { hatch: true, diagonal: true, density: 6 },
    park: { hatch: false, diagonal: false, density: 0 },
    water: { hatch: true, diagonal: false, density: 4 },
    empty: { hatch: false, diagonal: false, density: 0 },
  }

  layoutData.forEach((row) => {
    row.forEach((cell) => {
      const cx = startX + cell.x * cellSize
      const cy = startY + cell.y * cellSize

      rc.rectangle(cx, cy, cellSize, cellSize, {
        stroke: cell.type === 'road' ? '#2d1f14' : '#6b5d4d',
        strokeWidth: cell.type === 'road' ? 2 : 1,
        roughness: 1.0,
        bowing: 0.6,
        fill: cell.type === 'road' ? '#4a3728' : cell.type === 'park' ? '#c5d8b0' : cell.type === 'water' ? '#b8d4e8' : undefined,
        fillStyle: 'solid',
      })

      const info = ZONE_HATCHES[cell.type]
      if (info?.hatch && info.density > 0) {
        const sp = info.density
        for (let i = 0; i < cellSize * 2; i += sp) {
          const x1 = cx + Math.min(i, cellSize)
          const y1 = cy + Math.max(0, i - cellSize)
          const x2 = cx + Math.max(0, i - cellSize)
          const y2 = cy + Math.min(i, cellSize)
          rc.line(x1, y1, x2, y2, { stroke: '#9b8b7a', strokeWidth: 0.4, roughness: 0.6 })
        }
      }
      if (info?.diagonal && info.density > 0) {
        rc.line(cx + 2, cy + 2, cx + cellSize - 2, cy + cellSize - 2, {
          stroke: '#b8a898', strokeWidth: 0.4, roughness: 1.2,
        })
      }

      // Show subtype abbreviation if available
      const abbrevs: Record<string, string> = {
        residential: 'R', commercial: 'C', industrial: 'I',
        park: 'P', water: 'W', road: '', empty: '',
      }
      if (abbrevs[cell.type]) {
        ctx.font = `${Math.min(10, cellSize / 3)}px "Courier New", monospace`
        ctx.fillStyle = cell.type === 'water' ? '#2d5f7b' : '#5c4a3a'
        ctx.textAlign = 'center'
        ctx.fillText(abbrevs[cell.type], cx + cellSize / 2, cy + cellSize / 2 + 3)
      }
    })
  })

  rc.rectangle(startX, startY, totalW, totalH, {
    stroke: '#2d1f14', strokeWidth: 2.5, roughness: 0.6, bowing: 0.3,
  })

  // Legend
  const legendY = startY + totalH + 25
  const legendItems = [
    { label: 'R — Residential' },
    { label: 'C — Commercial' },
    { label: 'I — Industrial' },
    { label: 'P — Park' },
    { label: 'W — Water' },
  ]
  const legendItemW = totalW / legendItems.length
  legendItems.forEach((item, i) => {
    const lx = startX + i * legendItemW
    ctx.font = '7px "Courier New", monospace'
    ctx.fillStyle = '#6b5d4d'
    ctx.textAlign = 'left'
    ctx.fillText(item.label, lx + 14, legendY + 8)
    rc.rectangle(lx, legendY, 10, 10, { stroke: '#6b5d4d', strokeWidth: 0.8, roughness: 0.8 })
  })

  drawNorthArrow(ctx, rc, W - 40, 70)

  ctx.font = '7px "Courier New", monospace'
  ctx.fillStyle = '#a09080'
  ctx.textAlign = 'right'
  ctx.fillText(`MASTER PLAN — ${new Date().toLocaleDateString()}`, W - 20, H - 10)
}


/* ═══════ Component ═══════ */
export function BlueprintView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectedCell = useStore((s) => s.selectedCell)
  const layoutData = useStore((s) => s.layoutData)

  useEffect(() => {
    if (!canvasRef.current) return
    drawBlueprint(canvasRef.current, selectedCell, layoutData)
  }, [selectedCell, layoutData])

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) drawBlueprint(canvasRef.current, selectedCell, layoutData)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [selectedCell, layoutData])

  const handleDownload = () => {
    if (!canvasRef.current) return
    const url = canvasRef.current.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `blueprint-${selectedCell ? `${selectedCell.x}-${selectedCell.y}` : 'overview'}-${Date.now()}.png`
    a.click()
  }

  return (
    <div className="blueprint-view">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <button className="blueprint-download-btn" onClick={handleDownload} title="Download Blueprint as PNG">
        <Download size={15} strokeWidth={1.5} />
        <span>Export PNG</span>
      </button>
      {selectedCell && selectedCell.type !== 'road' && selectedCell.type !== 'water' && selectedCell.type !== 'empty' && (
        <div className="blueprint-hint">
          Click a different zone in 2D/3D to see its floor plan
        </div>
      )}
      {(!selectedCell || selectedCell.type === 'road' || selectedCell.type === 'water' || selectedCell.type === 'empty') && (
        <div className="blueprint-hint">
          Select a building zone to view its detailed floor plan
        </div>
      )}
    </div>
  )
}
