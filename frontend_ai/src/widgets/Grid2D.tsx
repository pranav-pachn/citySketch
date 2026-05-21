import { useMemo, useEffect, useState } from 'react'
import { useStore } from '@/entities/store/useStore'
import { motion } from 'framer-motion'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Building2, Home, Trees, Waves, Factory, Route, Stethoscope, GraduationCap } from 'lucide-react'
import type { GridCell } from '@/entities/types'
import { calculateCellHighlights } from '@/shared/utils/scoring'
import { ZONE_COLORS } from '@/shared/utils/colors'
import { getZonePalette } from '@/shared/theme/zonePalette'

const ICON_MAP: Record<GridCell['type'], any> = {
  road: Route,
  residential: Home,
  commercial: Building2,
  park: Trees,
  hospital: Stethoscope,
  industrial: Factory,
  water: Waves,
  school: GraduationCap,
  empty: null,
}

const LABELS: Record<GridCell['type'], { label: string; fullName: string }> = {
  road: { label: 'RD', fullName: 'Road / Transit' },
  residential: { label: 'RES', fullName: 'Residential Zone' },
  commercial: { label: 'COM', fullName: 'Commercial Zone' },
  park: { label: 'PRK', fullName: 'Park / Green Space' },
  hospital: { label: 'HSP', fullName: 'Hospital / Healthcare' },
  industrial: { label: 'IND', fullName: 'Industrial Zone' },
  water: { label: 'H2O', fullName: 'Water / River' },
  school: { label: 'SCH', fullName: 'School / Education' },
  empty: { label: '', fullName: 'Empty Lot' },
}

const ALL_TYPES: GridCell['type'][] = ['road','residential','commercial','park','hospital','industrial','water','school']

function getCellStyle(type: GridCell['type'], isNightMode: boolean) {
  const pal = getZonePalette(isNightMode)
  const color = pal[type as keyof typeof pal]?.base ?? (ZONE_COLORS as any)[type]?.hex ?? '#cccccc'
  return {
    color,
    icon: ICON_MAP[type],
    label: LABELS[type].label,
    fullName: LABELS[type].fullName,
  }
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
  const isNightMode = useStore((s) => s.isNightMode)

  const highlights = useMemo(() => {
    if (!layoutData || !highlightMode) return {}
    return calculateCellHighlights(layoutData)
  }, [layoutData, highlightMode])

  // Animated generation: reveal cells progressively when generationId changes using requestAnimationFrame
  const [revealedIndex, setRevealedIndex] = useState(-1)
  useEffect(() => {
    if (!layoutData) {
      setRevealedIndex(-1)
      return
    }
    const total = layoutData.flat().length
    const maxDuration = 1400 // ms total target
    setRevealedIndex(-1)

    let animationFrameId: number
    const startTime = performance.now()

    const animate = (time: number) => {
      const elapsed = time - startTime
      const progress = Math.min(1, elapsed / maxDuration)
      const currentRevealCount = Math.floor(progress * total)
      
      setRevealedIndex(currentRevealCount - 1)
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setRevealedIndex(total - 1)
      }
    }

    animationFrameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrameId)
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
              const style = getCellStyle(cell.type, isNightMode)
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
                                       : (isSelected ? `${style.color}20` : 'transparent'),
                    boxShadow: isSelected
                      ? `0 0 0 2px ${style.color}60, 0 0 20px ${style.color}30`
                      : isHovered ? `0 0 0 1px ${style.color}30` : 'none',
                  }}
                  title={cell.type !== 'empty' ? style.fullName : undefined}
                >
                  {/* Subtle top indicator bar */}
                  {cell.type !== 'empty' && (
                     <div 
                       className="cell-indicator" 
                       style={{ backgroundColor: style.color, opacity: isSelected ? 1 : 0.6 }} 
                     />
                  )}
                  
                  {/* Icon & Label */}
                  <div className="cell-content" style={{ color: isHovered || isSelected ? style.color : (isNightMode ? '#a1a1aa' : '#52525b') }}>
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

      {/* Generating state overlay */}
      {revealedIndex >= 0 && layoutData && (() => {
        const total = layoutData.flat().length
        const percent = Math.round(((revealedIndex + 1) / Math.max(1, total)) * 100)
        const finished = revealedIndex >= total - 1
        if (finished) return null
        return (
          <div className="generating-overlay" aria-live="polite">
            <div className="generating-card">
              <div className="generating-orb" />
              <div className="generating-text">Generating optimized layout…</div>
              <div className="generating-progress-track">
                <div className="generating-progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <div className="generating-pct">{percent}%</div>
            </div>
          </div>
        )
      })()}

      {/* Zone Legend — top-left, always visible */}
      <div className="grid-legend-topbar">
        {ALL_TYPES.map((type) => {
          const s = getCellStyle(type, isNightMode)
          return (
            <div key={type} className="grid-legend-item" title={s.fullName}>
              <span className="grid-legend-dot" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}60` }} />
              <span className="grid-legend-label">{s.label}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
