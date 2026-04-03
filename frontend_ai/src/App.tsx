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
import { getExplanation } from './utils/explain.js'
import type { GridCell } from './types'
import './index.css'

export default function App() {
  const setViewMode = useStore((s) => s.setViewMode)
  const newSession = useStore((s) => s.newSession)
  const setSelectedCell = useStore((s) => s.setSelectedCell)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const isCanvasMaximized = useStore((s) => s.isCanvasMaximized)
  const setCanvasMaximized = useStore((s) => s.setCanvasMaximized)
  const layoutData = useStore((s) => s.layoutData)
  const [explanation, setExplanation] = useState('')
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  // Initial load
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Recompute planning metrics whenever a fresh layout arrives or changes.
  useEffect(() => {
    if (!layoutData) {
      setExplanation('')
      setIsExplanationOpen(false)
      return
    }
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
                  className="absolute inset-0 z-[115] bg-black/40 backdrop-blur-sm"
                />
                <motion.aside
                  initial={{ x: 420, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 420, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="absolute right-0 top-0 z-[120] flex h-full w-[380px] max-w-[92vw] flex-col border-l border-zinc-800 bg-zinc-950/95 p-5 text-white shadow-2xl backdrop-blur-md"
                >
                  <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                        Explanation
                      </div>
                      <div className="mt-1 text-xl font-bold tracking-tight text-zinc-100">Planning Rationale</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExplanationOpen(false)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                      aria-label="Close panel"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>

                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 shadow-inner">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-blue-300">
                      Selected Cell Reason
                    </div>
                    <div className="mt-3 text-[15px] leading-relaxed text-zinc-100">
                      {explanation || 'Click a cell to see the planning reason behind that zone.'}
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Why This Exists
                    </div>
                    <div className="mt-2 text-[13px] leading-relaxed text-zinc-300">
                      This panel helps users read the city like an urban-planning sketch, translating each zone placement into a simple planning decision.
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Interaction Hint
                    </div>
                    <div className="mt-2 text-[13px] leading-relaxed text-zinc-400">
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

