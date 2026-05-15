import { useEffect, useState, lazy, Suspense } from 'react'
import { useStore } from '@/entities/store/useStore'
import { Sidebar, SidebarExpandBtn } from '@/widgets/Sidebar'
import { WorkspaceHeader } from '@/widgets/WorkspaceHeader'
import { Canvas } from '@/widgets/Canvas'
import { ChatInput } from '@/features/ChatInput'
import { CellDetail } from '@/features/CellDetail'
import { Toasts } from '@/shared/ui/Toast'
import { Minimize2, MapPin } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { getExplanation } from '@/shared/utils/explain.js'
import type { GridCell } from '@/entities/types'
import '@/app/index.css'

// Lazy-load the map component to avoid loading leaflet until needed
import type { MapSiteContext } from '@/features/SiteSelector'
const SiteSelector = lazy<React.ComponentType<{ onClose: () => void; onConfirm: (ctx: MapSiteContext) => void }>>(() => import('@/features/SiteSelector').then((m) => ({ default: m.SiteSelector })))

export default function App() {
  const setViewMode = useStore((s) => s.setViewMode)
  const newSession = useStore((s) => s.newSession)
  const setSelectedCell = useStore((s) => s.setSelectedCell)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const fetchHistory = useStore((s) => s.fetchHistory)
  const isCanvasMaximized = useStore((s) => s.isCanvasMaximized)
  const setCanvasMaximized = useStore((s) => s.setCanvasMaximized)
  const layoutData = useStore((s) => s.layoutData)
  const submitMapContext = useStore((s) => s.submitMapContext)
  const isLoading = useStore((s) => s.isLoading)
  const [explanation, setExplanation] = useState('')
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)
  const [showMapSelector, setShowMapSelector] = useState(false)

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
        setShowMapSelector(false)
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
                  className="absolute right-3 top-3 z-[120] flex h-[calc(100%-24px)] w-[420px] max-w-[92vw] flex-col rounded-[28px] border border-zinc-800/80 bg-zinc-950/95 px-5 pb-5 pt-7 text-white shadow-2xl backdrop-blur-xl sm:px-6 sm:pb-6 sm:pt-8"
                >
                  <div className="mb-5 flex items-start justify-between gap-4 border-b border-zinc-800/70 px-1 pb-4">
                    <div className="space-y-2 pr-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                        CitySketch Analysis
                      </div>
                      <div className="text-[28px] font-extrabold leading-[1.02] tracking-[-0.03em] text-zinc-50">Planning Rationale</div>
                      <p className="max-w-[36ch] text-[15px] leading-7 text-zinc-400">
                        Read the layout like a planning board, with quick context on why each zone was placed where it is.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExplanationOpen(false)}
                      className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 transition-all hover:scale-105 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none"
                      aria-label="Close panel"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>

                  <div className="styled-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2 pt-1">
                    <div className="group relative rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-900/5 px-5 py-4 shadow-lg transition-all hover:bg-blue-500/15">
                      <div className="absolute bottom-4 left-0 top-4 w-1 rounded-r-2xl bg-blue-500/50"></div>
                      <div className="pl-5">
                        <div className="mb-2.5 flex items-center gap-2.5">
                          <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
                            Selected Cell Reason
                          </div>
                        </div>
                        <div className="text-[15px] font-medium leading-7 text-blue-50">
                          {explanation || 'Click a cell to see the planning reason behind that zone.'}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-4 transition-colors hover:bg-zinc-900/50">
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <div className="mt-0.5 text-zinc-500">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          Why This Exists
                        </div>
                      </div>
                      <div className="text-[15px] leading-7 text-zinc-300">
                        This panel helps users read the city like an <span className="text-zinc-100 font-medium">urban-planning sketch</span>, translating each zone placement into a simple planning decision.
                      </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/30 px-5 py-4 transition-colors hover:bg-zinc-900/50">
                      <div className="mb-2.5 flex items-center gap-2.5">
                        <div className="mt-0.5 text-zinc-500">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 Z"></path></svg>
                        </div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          Interaction Hint
                        </div>
                      </div>
                      <div className="text-[15px] leading-7 text-zinc-400">
                        Click different cells in the <span className="rounded-lg bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-200">2D grid</span> to compare why homes, parks, roads, and hospitals were placed where they are.
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
        <div style={{ position: 'relative' }}>
          <ChatInput />
          <button
            onClick={() => setShowMapSelector(true)}
            disabled={isLoading}
            className="absolute right-3 -top-12 z-30 flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-zinc-300 shadow-lg backdrop-blur transition hover:border-blue-500/50 hover:bg-zinc-800 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            title="Select a real-world location to simulate"
          >
            <MapPin size={14} />
            Import from Map
          </button>
        </div>
      </main>
      <Toasts />

      {/* Map Site Selector Modal */}
      {showMapSelector && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950">
            <div className="animate-spin h-8 w-8 rounded-full border-2 border-zinc-700 border-t-blue-500" />
          </div>
        }>
          <SiteSelector
            onClose={() => setShowMapSelector(false)}
            onConfirm={(ctx) => {
              setShowMapSelector(false)
              submitMapContext(ctx.bbox, ctx.locationName, 20)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}


