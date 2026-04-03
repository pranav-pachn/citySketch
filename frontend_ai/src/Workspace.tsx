import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { Sidebar, SidebarExpandBtn } from './components/Sidebar'
import { WorkspaceHeader } from './components/WorkspaceHeader'
import { Canvas } from './components/Canvas'
import { ChatInput } from './components/ChatInput'
import { CellDetail } from './components/CellDetail'
import { Toasts } from './components/Toast'
import { Minimize2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { calculateScores } from './utils/scoring.js'
import { getExplanation } from './utils/explain.js'
import type { GridCell } from './types'
import './index.css'

interface CityScores {
  sustainability?: string
  traffic?: string
  walkability?: string
}

export default function App() {
  const setViewMode = useStore((s) => s.setViewMode)
  const newSession = useStore((s) => s.newSession)
  const setSelectedCell = useStore((s) => s.setSelectedCell)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const isCanvasMaximized = useStore((s) => s.isCanvasMaximized)
  const setCanvasMaximized = useStore((s) => s.setCanvasMaximized)
  const layoutData = useStore((s) => s.layoutData)
  const [scores, setScores] = useState<CityScores>({})
  const [explanation, setExplanation] = useState('')
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  // Initial load
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Recompute planning metrics whenever a fresh layout arrives or changes.
  useEffect(() => {
    if (!layoutData) {
      setScores({})
      setExplanation('')
      setIsExplanationOpen(false)
      return
    }

    const newScores = calculateScores(layoutData)
    setScores(newScores)
  }, [layoutData])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle when typing in input
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === '1') setViewMode('2D')
      if (e.key === '2') setViewMode('3D')
      if (e.key === '3') setViewMode('CODE')
      if (e.key === 'Escape') {
        setSelectedCell(null)
        setCanvasMaximized(false)
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        newSession()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setViewMode, newSession, setSelectedCell, toggleSidebar])

  const handleCellExplain = (cellType: GridCell['type']) => {
    setExplanation(getExplanation(cellType))
    setIsExplanationOpen(true)
  }

  return (
    <div className="app">
      <Sidebar />
      <SidebarExpandBtn />
      <main className="workspace">
        <WorkspaceHeader />
        <div className={`workspace-body ${isCanvasMaximized ? 'fixed inset-0 z-[100] bg-[#0b0f14]' : ''}`}>
          {isCanvasMaximized && (
            <button
              onClick={() => setCanvasMaximized(false)}
              className="absolute top-4 left-4 z-[110] p-2 bg-zinc-800 text-white rounded-md shadow-lg border border-zinc-700/50 hover:bg-zinc-700 transition"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 size={18} />
            </button>
          )}
          {layoutData && (
            <div className="absolute bottom-4 left-4 z-[105] w-[340px] max-w-[calc(100%-2rem)]">
              <div className="rounded-2xl border border-emerald-400/20 bg-[#0f172a]/92 p-4 text-white shadow-2xl backdrop-blur">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300/80">
                      Scoring
                    </div>
                    <div className="mt-1 text-lg font-semibold">Urban Metrics</div>
                  </div>
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                    Live
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Sustainability</div>
                    <div className="mt-1 text-lg font-semibold">{scores.sustainability ?? '0.00'}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Traffic</div>
                    <div className="mt-1 text-lg font-semibold">{scores.traffic ?? '0.00'}</div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">Walkability</div>
                    <div className="mt-1 text-lg font-semibold">{scores.walkability ?? 'Low'}</div>
                  </div>
                </div>

                <div className="mt-3 text-xs leading-5 text-zinc-300">
                  Evaluates the layout as an urban-planning system using park coverage, road density, and residential access to green space.
                </div>
              </div>
            </div>
          )}
          <AnimatePresence>
            {layoutData && isExplanationOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close explanation panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsExplanationOpen(false)}
                  className="absolute inset-0 z-[115] bg-black/35 backdrop-blur-[1px]"
                />
                <motion.aside
                  initial={{ x: 420, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 420, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="absolute right-0 top-0 z-[120] flex h-full w-[380px] max-w-[92vw] flex-col border-l border-cyan-400/20 bg-[#0b1220]/96 p-5 text-white shadow-[0_0_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80">
                        Explanation
                      </div>
                      <div className="mt-1 text-xl font-semibold">Planning Rationale</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExplanationOpen(false)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-200 transition hover:bg-white/10"
                    >
                      Close
                    </button>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-cyan-200/80">
                      Selected Cell Reason
                    </div>
                    <div className="mt-2 text-base leading-7 text-white">
                      {explanation || 'Click a cell to see the planning reason behind that zone.'}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                      Why This Exists
                    </div>
                    <div className="mt-2 text-sm leading-6 text-zinc-200">
                      This panel helps users read the city like an urban-planning sketch, translating each zone placement into a simple planning decision.
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                      Interaction Hint
                    </div>
                    <div className="mt-2 text-sm leading-6 text-zinc-300">
                      Click different cells in the 2D grid to compare why homes, parks, roads, and hospitals were placed where they are.
                    </div>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
          <Canvas onCellExplain={handleCellExplain} />
          <CellDetail />
        </div>
        <ChatInput />
      </main>
      <Toasts />
    </div>
  )
}
