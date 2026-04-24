import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Pencil, Save, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { GridCell } from '../types'
import { calculateCellHighlights } from '../utils/scoring'

const ZONE_INFO: Record<GridCell['type'], { color: string; description: string }> = {
  road: { color: '#374151', description: 'Transportation infrastructure — streets, highways, and pathways.' },
  residential: { color: '#1d4ed8', description: 'Housing zones — apartments, houses, and residential complexes.' },
  commercial: { color: '#b45309', description: 'Business areas — shops, offices, and commercial centers.' },
  park: { color: '#15803d', description: 'Green spaces — parks, gardens, and recreational areas.' },
  hospital: { color: '#dc2626', description: 'Medical services — hospitals, clinics, and healthcare support.' },
  industrial: { color: '#6b21a8', description: 'Industrial zones — factories, warehouses, and manufacturing.' },
  water: { color: '#0e7490', description: 'Water bodies — rivers, lakes, and reservoirs.' },
  school: { color: '#7a39bb', description: 'Education facilities — schools, campuses, and learning centers.' },
  empty: { color: '#1f2937', description: 'Unassigned land — available for development.' },
}

const ALL_TYPES: GridCell['type'][] = ['road', 'residential', 'commercial', 'park', 'hospital', 'industrial', 'water', 'school', 'empty']

function getNeighborCells(grid: GridCell[][], cell: GridCell) {
  const neighbors: GridCell[] = []
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  for (const [dx, dy] of offsets) {
    const neighbor = grid[cell.y + dy]?.[cell.x + dx]
    if (neighbor) neighbors.push(neighbor)
  }
  return neighbors
}

function getManhattanDistance(a: GridCell, b: GridCell) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function getNearestOfType(grid: GridCell[][], cell: GridCell, types: string[]): { cell: GridCell; dist: number } | null {
  let nearest: { cell: GridCell; dist: number } | null = null
  grid.forEach(row => row.forEach(c => {
    if (!types.includes(c.type)) return
    const d = getManhattanDistance(cell, c)
    if (!nearest || d < nearest.dist) nearest = { cell: c, dist: d }
  }))
  return nearest
}

function buildAnalysis(grid: GridCell[][], cell: GridCell): { status: 'good' | 'warn' | 'info'; lines: string[] } {
  const neighbors = getNeighborCells(grid, cell)
  const neighborTypes = new Set(neighbors.map(n => n.type))
  const lines: string[] = []
  let status: 'good' | 'warn' | 'info' = 'info'

  switch (cell.type) {
    case 'residential': {
      const nearPark = getNearestOfType(grid, cell, ['park'])
      const nearHospital = getNearestOfType(grid, cell, ['hospital'])
      const nearShop = getNearestOfType(grid, cell, ['commercial'])

      if (nearPark) {
        if (nearPark.dist <= 2) { lines.push(`✅ Park only ${nearPark.dist} block(s) away — excellent walkability.`); status = 'good' }
        else if (nearPark.dist <= 4) { lines.push(`⚠️ Nearest park is ${nearPark.dist} blocks away — walkability could improve.`); if (status !== 'good') status = 'warn' }
        else { lines.push(`❌ No park within 4 blocks (nearest: ${nearPark.dist}) — poor green access.`); status = 'warn' }
      } else {
        lines.push('❌ No parks in layout — residents lack green space.')
        status = 'warn'
      }

      if (nearHospital) {
        if (nearHospital.dist <= 4) lines.push(`✅ Hospital ${nearHospital.dist} block(s) away — good healthcare access.`)
        else { lines.push(`⚠️ Hospital is ${nearHospital.dist} blocks away — healthcare access is limited.`); if (status === 'info') status = 'warn' }
      } else {
        lines.push('❌ No hospital in layout — healthcare gap detected.')
        if (status === 'info') status = 'warn'
      }

      if (nearShop) {
        if (nearShop.dist <= 3) lines.push(`✅ Commercial zone ${nearShop.dist} block(s) away — convenient access to services.`)
        else lines.push(`ℹ️ Nearest commercial zone is ${nearShop.dist} blocks away.`)
      }

      if (neighborTypes.has('road')) lines.push('✅ Connected to road network.')
      else lines.push('⚠️ No direct road access — connectivity may be limited.')
      break
    }

    case 'park': {
      const resCount = neighbors.filter(n => n.type === 'residential').length
      if (resCount > 0) { lines.push(`✅ Serves ${resCount} adjacent residential block(s) — high walkability impact.`); status = 'good' }
      else {
        const nearRes = getNearestOfType(grid, cell, ['residential'])
        if (nearRes) lines.push(`ℹ️ Nearest residential is ${nearRes.dist} blocks away — limited direct walkability benefit.`)
        else lines.push('ℹ️ No residential zones in layout to benefit from this park.')
      }
      if (neighborTypes.has('school')) lines.push('✅ Adjacent to school — outdoor activity space for students.')
      break
    }

    case 'hospital': {
      const nearRoad = getNearestOfType(grid, cell, ['road'])
      if (neighborTypes.has('road')) { lines.push('✅ Direct road access — optimal for emergency response.'); status = 'good' }
      else if (nearRoad && nearRoad.dist <= 2) lines.push(`⚠️ Road is ${nearRoad.dist} blocks away — emergency access could be faster.`)
      else { lines.push('❌ No nearby road — emergency access is severely limited.'); status = 'warn' }

      const nearRes = getNearestOfType(grid, cell, ['residential'])
      if (nearRes) {
        if (nearRes.dist <= 4) { lines.push(`✅ Serves residential blocks within ${nearRes.dist} block(s).`); if (status !== 'warn') status = 'good' }
        else lines.push(`ℹ️ Closest residential zone is ${nearRes.dist} blocks away.`)
      }
      break
    }

    case 'commercial': {
      if (neighborTypes.has('road')) { lines.push('✅ Road access — good for foot traffic and deliveries.'); status = 'good' }
      else lines.push('⚠️ No road access — limits commercial viability.')
      const resCount = neighbors.filter(n => n.type === 'residential').length
      if (resCount > 0) { lines.push(`✅ Adjacent to ${resCount} residential block(s) — strong local customer base.`); if (status !== 'warn') status = 'good' }
      else lines.push('ℹ️ No residential neighbors — may have lower foot traffic.')
      break
    }

    case 'school': {
      const nearRes = getNearestOfType(grid, cell, ['residential'])
      if (nearRes && nearRes.dist <= 3) { lines.push(`✅ ${nearRes.dist} block(s) from residential — short commute for students.`); status = 'good' }
      else if (nearRes) lines.push(`⚠️ Residential is ${nearRes.dist} blocks away — longer commute for students.`)
      if (neighborTypes.has('park')) lines.push('✅ Adjacent park provides outdoor space for students.')
      if (!neighborTypes.has('road') && !neighborTypes.has('commercial')) lines.push('✅ Placed in low-traffic interior — safe environment.')
      break
    }

    case 'road': {
      const connectedTypes = new Set(neighbors.map(n => n.type))
      connectedTypes.delete('road')
      if (connectedTypes.size > 0) {
        lines.push(`✅ Connects: ${[...connectedTypes].join(', ')} zones.`)
        status = 'good'
      } else {
        lines.push('ℹ️ Connects to other road segments — part of the road network.')
      }
      break
    }

    case 'industrial': {
      const nearRes = getNearestOfType(grid, cell, ['residential'])
      if (nearRes) {
        if (nearRes.dist >= 4) { lines.push(`✅ Industrial well-separated from residential (${nearRes.dist} blocks).`); status = 'good' }
        else { lines.push(`⚠️ Too close to residential zone (${nearRes.dist} blocks) — pollution and noise risk.`); status = 'warn' }
      } else lines.push('✅ No nearby residential — safe industrial placement.')
      if (neighborTypes.has('road')) lines.push('✅ Road access for freight and logistics.')
      break
    }

    case 'water':
      lines.push('ℹ️ Water body shapes urban form and may restrict adjacent development.')
      if (neighborTypes.has('park')) lines.push('✅ Adjacent park — waterfront green space enhances livability.')
      break

    default:
      lines.push('ℹ️ This cell is currently unassigned and available for development.')
  }

  return { status, lines }
}

export function CellDetail() {
  const selectedCell = useStore((s) => s.selectedCell)
  const layoutData = useStore((s) => s.layoutData)
  const detailOpen = useStore((s) => s.detailOpen)
  const setDetailOpen = useStore((s) => s.setDetailOpen)
  const updateCellType = useStore((s) => s.updateCellType)
  const saveCurrentLayout = useStore((s) => s.saveCurrentLayout)
  const hasUnsavedLayoutChanges = useStore((s) => s.hasUnsavedLayoutChanges)

  const info = selectedCell ? ZONE_INFO[selectedCell.type] : null

  const analysis = useMemo(() => {
    if (!selectedCell || !layoutData) return null
    return buildAnalysis(layoutData, selectedCell)
  }, [selectedCell, layoutData])

  const highlightInfo = useMemo(() => {
    if (!selectedCell || !layoutData) return null
    const highlights = calculateCellHighlights(layoutData)
    return highlights[`${selectedCell.x},${selectedCell.y}`] || null
  }, [selectedCell, layoutData])

  return (
    <AnimatePresence>
      {detailOpen && selectedCell && info && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="cell-detail"
        >
          <div className="cell-detail-inner">
            {/* Header */}
            <div className="cell-detail-header">
              <span className="cell-detail-title">Zone Analysis</span>
              <button className="cell-detail-close" onClick={() => setDetailOpen(false)}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Zone type badge + description */}
            <div className="cell-detail-section">
              <div className="zone-badge" style={{ backgroundColor: info.color }}>
                <span className="zone-badge-text">{selectedCell.type}</span>
              </div>
              <p className="zone-description">{info.description}</p>
            </div>

            {/* Visual Analysis score if applicable */}
            {highlightInfo && (
              <div className="cell-detail-section">
                <div className="detail-section-header">
                  {highlightInfo.type === 'good'
                    ? <CheckCircle2 size={13} strokeWidth={1.5} color="#22c55e" />
                    : <AlertTriangle size={13} strokeWidth={1.5} color="#ef4444" />}
                  <span style={{ color: highlightInfo.type === 'good' ? '#22c55e' : '#ef4444' }}>
                    {highlightInfo.type === 'good' ? 'Well-Placed Zone' : 'Zone Problem Detected'}
                  </span>
                </div>
                <div className="explanation-panel" style={{
                  borderColor: highlightInfo.type === 'good' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  color: highlightInfo.type === 'good' ? 'rgba(187,247,208,0.9)' : 'rgba(254,202,202,0.9)'
                }}>
                  {highlightInfo.reason}
                </div>
              </div>
            )}

            {/* Dynamic analysis lines */}
            {analysis && analysis.lines.length > 0 && (
              <div className="cell-detail-section">
                <div className="detail-section-header">
                  <Info size={13} strokeWidth={1.5} />
                  <span>Planning Analysis</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {analysis.lines.map((line, i) => (
                    <div key={i} className="explanation-panel" style={{ padding: '6px 10px', fontSize: '12px', lineHeight: 1.5 }}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coordinates */}
            <div className="cell-detail-section">
              <div className="detail-row">
                <MapPin size={14} strokeWidth={1.5} />
                <span className="detail-label">Position</span>
                <span className="detail-value">({selectedCell.x}, {selectedCell.y})</span>
              </div>
            </div>

            {/* Edit zone type */}
            <div className="cell-detail-section">
              <div className="detail-section-header">
                <Pencil size={13} strokeWidth={1.5} />
                <span>Change zone type</span>
              </div>
              <div className="zone-picker">
                {ALL_TYPES.filter(t => t !== 'empty').map((type) => (
                  <button
                    key={type}
                    className={`zone-pick-btn ${selectedCell.type === type ? 'active' : ''}`}
                    style={{ '--zone-color': ZONE_INFO[type].color } as React.CSSProperties}
                    onClick={() => updateCellType(selectedCell.x, selectedCell.y, type)}
                  >
                    <span className="zone-pick-swatch" style={{ backgroundColor: ZONE_INFO[type].color }} />
                    <span>{type}</span>
                  </button>
                ))}
              </div>
              {hasUnsavedLayoutChanges && (
                <button
                  type="button"
                  className="save-layout-btn"
                  onClick={() => void saveCurrentLayout()}
                >
                  <Save size={12} strokeWidth={1.8} />
                  <span>Save layout</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

