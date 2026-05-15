import { useMemo, useEffect, useState } from 'react'
import { useStore } from '@/entities/store/useStore'
import { motion } from 'framer-motion'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Building2, Home, Trees, Waves, Factory, Route, Stethoscope, GraduationCap } from 'lucide-react'
import type { GridCell } from '@/entities/types'
import { calculateCellHighlights } from '@/shared/utils/scoring'

const CELL_STYLES: Record<GridCell['type'], { color: string, icon: any, label: string }> = {
  road: { color: '#52525b', icon: Route, label: 'RD' },
  residential: { color: '#3b82f6', icon: Home, label: 'RES' },
  commercial: { color: '#f59e0b', icon: Building2, label: 'COM' },
  park: { color: '#22c55e', icon: Trees, label: 'PRK' },
  hospital: { color: '#ef4444', icon: Stethoscope, label: 'HSP' },
  industrial: { color: '#a855f7', icon: Factory, label: 'IND' },
  water: { color: '#06b6d4', icon: Waves, label: 'H2O' },
  school: { color: '#9c27b0', icon: GraduationCap, label: 'SCH' },
  empty: { color: '#27272a', icon: null, label: '' },
}

interface Grid2DProps {
  onCellExplain?: (cellType: GridCell['type']) => void
}

export function Grid2D({ onCellExplain }: Grid2DProps) {
  const layoutData = useStore((s) => s.layoutData)
  const generationId = useStore((s) => s.generationId)
  const selectedCell = useStore((s) => s.selectedCell)
  const setSelectedCell = useStore((s) => s.setSelectedCell)
  const hoveredCell = useStore((s) => s.hoveredCell)
  const setHoveredCell = useStore((s) => s.setHoveredCell)
  const highlightMode = useStore((s) => s.highlightMode)

  const highlights = useMemo(() => {
    if (!layoutData || !highlightMode) return {}
    return calculateCellHighlights(layoutData)
  }, [layoutData, highlightMode])

  // Animated generation: reveal cells progressively when generationId changes
  const [revealedIndex, setRevealedIndex] = useState(-1)
  useEffect(() => {
    if (!layoutData) {
      setRevealedIndex(-1)
      return
    }
    const total = layoutData.flat().length
    const maxDuration = 1400 // ms total target
    const cellDelay = Math.max(6, Math.min(24, Math.floor(maxDuration / Math.max(1, total))))
    setRevealedIndex(-1)
    const timers: number[] = []
    for (let i = 0; i < total; i++) {
      const t = window.setTimeout(() => setRevealedIndex(i), i * cellDelay)
      timers.push(t)
    }
    // Ensure final reveal
    timers.push(window.setTimeout(() => setRevealedIndex(total - 1), total * cellDelay + 50))
    return () => timers.forEach((t) => clearTimeout(t))
  }, [generationId, layoutData])

  if (!layoutData) return null

  const rows = layoutData.length
  const cols = layoutData[0]?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="grid-2d-wrapper w-full h-full relative"
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.08, smoothStep: 0.003 }}
        panning={{ velocityDisabled: false, excluded: ['blueprint-cell', 'cell-content', 'cell-label', 'cell-coords'] }}
        doubleClick={{ mode: 'reset' }}
        limitToBounds={false}
      >
        {() => (
        <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
          <div
            className="grid-2d-blueprint"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 80px)`,
              gridTemplateRows: `repeat(${rows}, 80px)`,
              gap: '4px',
              padding: '40px',
            }}
          >
            {layoutData.flat().map((cell, i) => {
              const isSelected = selectedCell?.x === cell.x && selectedCell?.y === cell.y
              const isHovered = hoveredCell?.x === cell.x && hoveredCell?.y === cell.y
              const style = CELL_STYLES[cell.type]
              const Icon = style.icon

              const shouldAnimate = generationId > 0
              const revealDelay = shouldAnimate ? Math.min(i * 0.015, 0.9) : 0

              const isRevealed = revealedIndex >= 0 ? i <= revealedIndex : true

              return (
                <motion.div
                  key={`${cell.x}-${cell.y}-${generationId}`}
                  initial={shouldAnimate ? { opacity: 0, scale: 0.75, y: 8 } : false}
                  animate={isRevealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.12, scale: 0.98 }}
                  transition={{ duration: 0.22, delay: revealDelay, ease: 'easeOut' }}
                  onClick={() => {
                    setSelectedCell(isSelected ? null : cell)
                    onCellExplain?.(cell.type)
                  }}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`blueprint-cell ${isSelected ? 'selected' : ''}`}
                  style={{
                    borderColor: isSelected ? style.color : 'var(--color-border)',
                    backgroundColor: highlights[`${cell.x},${cell.y}`] 
                                       ? highlights[`${cell.x},${cell.y}`].color 
                                       : (isSelected ? `${style.color}15` : 'transparent'),
                    boxShadow: isSelected ? `0 0 15px ${style.color}30` : 'none',
                  }}
                >
                  {/* Subtle top indicator bar */}
                  {cell.type !== 'empty' && (
                     <div 
                       className="cell-indicator" 
                       style={{ backgroundColor: style.color, opacity: isSelected ? 1 : 0.6 }} 
                     />
                  )}
                  
                  {/* Icon & Label */}
                  <div className="cell-content" style={{ color: isHovered || isSelected ? style.color : '#52525b' }}>
                    {isRevealed ? (
                      <>
                        {Icon && <Icon size={18} strokeWidth={1.5} />}
                        {cell.type !== 'empty' && <span className="cell-label">{style.label}</span>}
                      </>
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.02)' }} />
                    )}
                  </div>

                  {/* Coordinates minimal overlay */}
                  <div className="cell-coords">
                    {cell.x},{cell.y}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </TransformComponent>
        )}
      </TransformWrapper>

        {/* Building progress overlay */}
        {revealedIndex >= 0 && layoutData && (() => {
          const total = layoutData.flat().length
          const percent = Math.round(((revealedIndex + 1) / Math.max(1, total)) * 100)
          const finished = revealedIndex >= total - 1
          return (
            <div className="building-overlay" aria-hidden>
              <div className="building-box">
                {!finished ? (
                  <>
                    <div className="building-text">Building city… {percent}%</div>
                    <div className="building-progress"><div className="building-progress-fill" style={{ width: `${percent}%` }} /></div>
                  </>
                ) : (
                  <div className="building-text">Done</div>
                )}
              </div>
            </div>
          )
        })()}

      {/* Blueprint Legend Floating */}
      <div className="blueprint-legend">
        <div className="legend-item-bp">
          <span className="legend-emoji">🟦</span>
          <span className="legend-label-bp">Residential</span>
        </div>
        <div className="legend-item-bp">
          <span className="legend-emoji">🟩</span>
          <span className="legend-label-bp">Park</span>
        </div>
        <div className="legend-item-bp">
          <span className="legend-emoji">🟥</span>
          <span className="legend-label-bp">Hospital</span>
        </div>
        <div className="legend-item-bp">
          <span className="legend-emoji">⬜</span>
          <span className="legend-label-bp">Road</span>
        </div>
      </div>
    </motion.div>
  )
}
