import { useStore } from '@/entities/store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid2D } from './Grid2D'
import { Scene3D } from './Scene3D'
import { BlueprintView } from './BlueprintView'
import { CodeView } from '@/features/CodeView'
import { CompareView } from './CompareView'
import { Sparkles, MapPin } from 'lucide-react'
import { InsightsPanel } from './InsightsPanel'
import { ScorePanel } from './ScorePanel'
import type { GridCell } from '@/entities/types'

interface CanvasProps {
  onCellExplain?: (cellType: GridCell['type']) => void
  onImportFromMap?: () => void
}

function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="loading-skeleton"
    >
      <div className="skeleton-grid">
        {Array.from({ length: 48 }, (_, i) => (
          <div key={i} className="skeleton-cell" style={{ animationDelay: `${i * 30}ms` }} />
        ))}
      </div>
      <span className="loading-text">Generating optimized layout…</span>
    </motion.div>
  )
}

export function Canvas({ onCellExplain, onImportFromMap }: CanvasProps) {
  const viewMode = useStore((s) => s.viewMode)
  const layoutData = useStore((s) => s.layoutData)
  const isLoading = useStore((s) => s.isLoading)

  return (
    <div className="canvas">
      {/* Loading skeleton */}
      <AnimatePresence>
        {isLoading && <LoadingSkeleton />}
      </AnimatePresence>

      {/* Empty state */}
      {!layoutData && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="canvas-empty"
        >
          <div className="empty-icon">
            <Sparkles size={28} strokeWidth={1.2} />
          </div>
          <h2 className="empty-title">Describe a city layout</h2>
          <p className="empty-desc">
            Type a prompt below to generate a 2D city grid.<br />
            Try: "A coastal city with a central park and commercial district"
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-xs">
            <div className="flex items-center gap-2 w-full text-zinc-500">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] font-bold tracking-wider uppercase">or</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>
            <button
              onClick={onImportFromMap}
              className="mt-1 flex items-center justify-center gap-2 w-full rounded-xl border border-zinc-700 bg-zinc-900/60 px-5 py-3 text-sm font-semibold text-zinc-200 shadow-md transition hover:border-blue-500/50 hover:bg-zinc-800 hover:text-blue-400 cursor-pointer"
            >
              <MapPin size={16} className="text-blue-400" />
              Import from OpenStreetMap
            </button>
          </div>
        </motion.div>
      )}

      {/* Content */}
      {layoutData && !isLoading && (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="canvas-content"
          >
            {viewMode === '2D' && <Grid2D onCellExplain={onCellExplain} />}
            {viewMode === '3D' && <Scene3D />}
            {viewMode === 'CODE' && <CodeView />}
            {viewMode === 'BLUEPRINT' && <BlueprintView />}
            {viewMode === 'COMPARE' && <CompareView />}

            {/* Explainable AI Insights Panel */}
            {viewMode !== 'COMPARE' && <InsightsPanel />}

            {/* 📊 Live Score Panel — top-right analytics overlay */}
            {viewMode !== 'CODE' && viewMode !== 'COMPARE' && <ScorePanel />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
