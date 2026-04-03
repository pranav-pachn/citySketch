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
                    className="absolute right-3 top-3 z-[120] flex h-[calc(100%-24px)] w-[420px] max-w-[92vw] flex-col rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-6 text-white shadow-2xl backdrop-blur-xl"
                  >
                    <div className="mb-8 flex items-start justify-between gap-3 px-2 pt-2">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-1.5 flex items-center gap-2">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                           CitySketch Analysis
                        </div>
                        <div className="text-2xl font-extrabold tracking-tight text-zinc-50">Planning Rationale</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsExplanationOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 transition-all hover:scale-105 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none"
                        aria-label="Close panel"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col space-y-6 overflow-y-auto px-2 pb-6 styled-scrollbar">
                      <div className="group relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-900/5 p-6 shadow-lg transition-all hover:bg-blue-500/15">
                        <div className="absolute top-[10%] left-0 h-[80%] w-1 rounded-r-2xl bg-blue-500/50"></div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                          <div className="text-[11px] font-bold uppercase tracking-widest text-blue-300">
                            Selected Cell Reason
                          </div>
                        </div>
                        <div className="text-[16px] font-medium leading-relaxed text-blue-50 pl-4">
                          {explanation || 'Click a cell to see the planning reason behind that zone.'}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 transition-colors hover:bg-zinc-900/50">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="text-zinc-500">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                           </div>
                           <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                             Why This Exists
                           </div>
                        </div>
                        <div className="text-[14px] leading-relaxed text-zinc-300 pl-2">
                          This panel helps users read the city like an <span className="text-zinc-100 font-medium">urban-planning sketch</span>, translating each zone placement into a simple planning decision.
                        </div>
                      </div>

                      <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 transition-colors hover:bg-zinc-900/50">
                        <div className="flex items-center gap-2 mb-3">
                           <div className="text-zinc-500">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"></path></svg>
                           </div>
                           <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
                             Interaction Hint
                           </div>
                        </div>
                        <div className="text-[14px] leading-relaxed text-zinc-400 pl-2">
                          Click different cells in the <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-200">2D grid</span> to compare why homes, parks, roads, and hospitals were placed where they are.
                        </div>
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


