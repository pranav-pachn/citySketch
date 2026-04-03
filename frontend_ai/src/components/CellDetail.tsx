import { useStore } from '../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Pencil } from 'lucide-react'
import type { GridCell } from '../types'

const ZONE_INFO: Record<GridCell['type'], { color: string; description: string }> = {
  road: { color: '#374151', description: 'Transportation infrastructure — streets, highways, and pathways.' },
  residential: { color: '#1d4ed8', description: 'Housing zones — apartments, houses, and residential complexes.' },
  commercial: { color: '#b45309', description: 'Business areas — shops, offices, and commercial centers.' },
  park: { color: '#15803d', description: 'Green spaces — parks, gardens, and recreational areas.' },
  hospital: { color: '#dc2626', description: 'Medical services — hospitals, clinics, and healthcare support.' },
  industrial: { color: '#6b21a8', description: 'Industrial zones — factories, warehouses, and manufacturing.' },
  water: { color: '#0e7490', description: 'Water bodies — rivers, lakes, and reservoirs.' },
  empty: { color: '#1f2937', description: 'Unassigned land — available for development.' },
}

const ALL_TYPES: GridCell['type'][] = ['road', 'residential', 'commercial', 'park', 'hospital', 'industrial', 'water', 'empty']

function getNeighborCells(grid: GridCell[][], cell: GridCell) {
  const neighbors: GridCell[] = []
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]

  for (const [dx, dy] of offsets) {
    const neighbor = grid[cell.y + dy]?.[cell.x + dx]
    if (neighbor) neighbors.push(neighbor)
  }

  return neighbors
}

function getBlockExplanation(grid: GridCell[][], cell: GridCell) {
  const neighbors = getNeighborCells(grid, cell)
  const neighborTypes = new Set(neighbors.map((neighbor) => neighbor.type))

  switch (cell.type) {
    case 'park':
      if (neighborTypes.has('residential')) {
        return 'Park placed near residential for walkability.'
      }
      return 'Park placed to add green space and soften the district.'
    case 'hospital':
      if (neighborTypes.has('road')) {
        return 'Hospital placed near roads for emergency access and visibility.'
      }
      return 'Hospital placed to serve nearby neighborhoods.'
    case 'residential':
      if (neighborTypes.has('park')) {
        return 'Residential placed beside a park to improve livability and access to green space.'
      }
      if (neighborTypes.has('road')) {
        return 'Residential connected to roads for easy access while keeping homes reachable.'
      }
      return 'Residential zone creates housing capacity for the city.'
    case 'commercial':
      if (neighborTypes.has('road')) {
        return 'Commercial placed near roads for access, visibility, and foot traffic.'
      }
      return 'Commercial zone placed to support nearby neighborhoods with services and jobs.'
    case 'industrial':
      return 'Industrial area placed away from homes to separate heavy activity and traffic.'
    case 'road':
      return 'Road connects districts and keeps movement through the city efficient.'
    case 'water':
      return 'Water defines the landscape and shapes surrounding development.'
    default:
      return 'This area is reserved for future development.'
  }
}

export function CellDetail() {
  const selectedCell = useStore((s) => s.selectedCell)
  const layoutData = useStore((s) => s.layoutData)
  const detailOpen = useStore((s) => s.detailOpen)
  const setDetailOpen = useStore((s) => s.setDetailOpen)
  const updateCellType = useStore((s) => s.updateCellType)

  const info = selectedCell ? ZONE_INFO[selectedCell.type] : null
  const explanation = selectedCell && layoutData ? getBlockExplanation(layoutData, selectedCell) : ''

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
              <span className="cell-detail-title">Zone Details</span>
              <button className="cell-detail-close" onClick={() => setDetailOpen(false)}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Zone info */}
            <div className="cell-detail-section">
              <div className="zone-badge" style={{ backgroundColor: info.color }}>
                <span className="zone-badge-text">{selectedCell.type}</span>
              </div>
              <p className="zone-description">{info.description}</p>
            </div>

            <div className="cell-detail-section">
              <div className="detail-section-header">
                <span>Why this block is here</span>
              </div>
              <div className="explanation-panel">
                {explanation}
              </div>
            </div>

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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
