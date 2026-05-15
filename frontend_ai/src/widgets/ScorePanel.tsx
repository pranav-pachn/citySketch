import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/entities/store/useStore'
import { calculateScores } from '@/shared/utils/scoring.js'

const METRICS = [
  {
    key: 'sustainability',
    label: 'Sustain.',
    emoji: '🌿',
    color: '#22c55e',
  },
  {
    key: 'traffic',
    label: 'Traffic',
    emoji: '🚗',
    color: '#f59e0b',
  },
  {
    key: 'walkability',
    label: 'Walkability',
    emoji: '🚶',
    color: '#38bdf8',
  },
  {
    key: 'liveability',
    label: 'Liveability',
    emoji: '🏙️',
    color: '#a78bfa',
  },
]

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="score-bar-track">
      <motion.div
        className="score-bar-fill"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        style={{ background: color }}
      />
    </div>
  )
}

export function ScorePanel() {
  const layoutData = useStore((s) => s.layoutData)
  const evaluation = useStore((s) => s.evaluation)

  const scores = useMemo<Record<string, number> | null>(() => {
    if (!layoutData) return null

    // Prefer backend evaluation breakdown (authoritative)
    if (evaluation?.breakdown) {
      const b = evaluation.breakdown
      return {
        sustainability: Math.round(b.sustainability ?? 0),
        traffic:        Math.round(b.traffic        ?? 0),
        walkability:    Math.round(b.walkability    ?? 0),
        liveability:    Math.round(b.overall        ?? evaluation.score ?? 0),
      }
    }

    // Fall back to live frontend calculation from scoring.js
    const result = calculateScores(layoutData)
    const m = result.metrics
    return {
      sustainability: m.sustainability.value,
      traffic:        m.traffic.value,
      walkability:    m.walkability.value,
      liveability:    m.liveability.value,
    }
  }, [layoutData, evaluation])

  return (
    <AnimatePresence>
      {layoutData && scores && (
        <motion.div
          key="score-panel"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28, delay: 0.2 }}
          className="score-panel"
        >
          {/* Header */}
          <div className="score-panel-header">
            <div className="score-panel-dot" />
            <span className="score-panel-title">Live Metrics</span>
          </div>

          {/* Metric rows */}
          <div className="score-panel-metrics">
            {METRICS.map((m) => {
              const value = scores[m.key] ?? 0
              return (
                <div key={m.key} className="score-metric-row">
                  <div className="score-metric-left">
                    <span className="score-metric-emoji">{m.emoji}</span>
                    <span className="score-metric-label">{m.label}</span>
                  </div>
                  <div className="score-metric-right">
                    <ScoreBar value={value} color={m.color} />
                    <span className="score-metric-value" style={{ color: m.color }}>
                      {value}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
