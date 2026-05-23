import { useEffect, useState, lazy, Suspense } from 'react'
import { useStore } from '@/entities/store/useStore'
import { Sidebar, SidebarExpandBtn } from '@/widgets/Sidebar'
import { WorkspaceHeader } from '@/widgets/WorkspaceHeader'
import { Canvas } from '@/widgets/Canvas'
import { ChatInput } from '@/features/ChatInput'
import { CellDetail } from '@/features/CellDetail'
import { Toasts } from '@/shared/ui/Toast'
import { ExplanationPanel } from '@/widgets/ExplanationPanel'
import { Minimize2, MapPin } from 'lucide-react'
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

  // Auto-open explanation panel when a layout loads; close + clear when session resets
  useEffect(() => {
    if (!layoutData) {
      setExplanation('')
      setIsExplanationOpen(false)
      return
    }
    // Proactively open the AI panel on new generation
    setIsExplanationOpen(true)
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
          <Canvas
            onCellExplain={handleCellExplain}
            onImportFromMap={() => setShowMapSelector(true)}
          />
          {/* 🧠 AI Explanation Panel: persistent right-side, Figma/Notion AI-style */}
          {isExplanationOpen && (
            <ExplanationPanel
              explanation={explanation}
              onClose={() => setIsExplanationOpen(false)}
            />
          )}
          <CellDetail />
        </div>
        <div style={{ position: 'relative' }}>
          <ChatInput />
          <button
            onClick={() => setShowMapSelector(true)}
            disabled={isLoading}
            className="absolute right-5 -top-12 z-30 flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-zinc-300 shadow-lg backdrop-blur transition hover:border-blue-500/50 hover:bg-zinc-800 hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
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


