import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Grid3X3, Box, Code, Maximize2, Copy, Download, Moon, Sun, Minimize2, PenTool, FileJson, ChevronDown } from 'lucide-react'
import type { ViewMode } from '../types'

const viewOptions: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: '2D', label: '2D', icon: <Grid3X3 size={14} strokeWidth={1.5} /> },
  { id: '3D', label: '3D', icon: <Box size={14} strokeWidth={1.5} /> },
  { id: 'BLUEPRINT', label: 'Blueprint', icon: <PenTool size={14} strokeWidth={1.5} /> },
  { id: 'CODE', label: 'Code', icon: <Code size={14} strokeWidth={1.5} /> },
]

export function WorkspaceHeader() {
  const viewMode = useStore((s) => s.viewMode)
  const setViewMode = useStore((s) => s.setViewMode)
  const layoutData = useStore((s) => s.layoutData)
  const activeHistoryId = useStore((s) => s.activeHistoryId)
  const history = useStore((s) => s.history)
  const addToast = useStore((s) => s.addToast)
  const isNightMode = useStore((s) => s.isNightMode)
  const setNightMode = useStore((s) => s.setNightMode)
  const isCanvasMaximized = useStore((s) => s.isCanvasMaximized)
  const setCanvasMaximized = useStore((s) => s.setCanvasMaximized)

  const [showExportMenu, setShowExportMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeItem = history.find((h) => h.id === activeHistoryId)
  const title = activeItem
    ? activeItem.prompt.length > 50
      ? activeItem.prompt.slice(0, 50) + '…'
      : activeItem.prompt
    : 'CitySketch'

  const handleCopyJSON = () => {
    if (!layoutData) return
    navigator.clipboard.writeText(JSON.stringify(layoutData, null, 2))
    addToast('JSON copied to clipboard')
  }

  const handleExportJSON = () => {
    if (!layoutData) return
    const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `citysketch-layout-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('Layout exported as JSON')
    setShowExportMenu(false)
  }

  const downloadUrl = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setShowExportMenu(false)
  }

  const handleExportImage = async (mode: ViewMode) => {
    if (mode === '3D') {
      const canvas = document.querySelector('.scene-3d-wrapper canvas') as HTMLCanvasElement
      if (canvas) {
        downloadUrl(canvas.toDataURL('image/png'), `citysketch-3d-${Date.now()}.png`)
        addToast('3D Render exported')
      } else {
        addToast('Please switch to 3D view to capture')
      }
    } else if (mode === 'BLUEPRINT') {
      const canvas = document.querySelector('.blueprint-view canvas') as HTMLCanvasElement
      if (canvas) {
        downloadUrl(canvas.toDataURL('image/png'), `citysketch-blueprint-${Date.now()}.png`)
        addToast('Blueprint exported')
      } else {
        addToast('Please switch to Blueprint view to capture')
      }
    } else if (mode === '2D') {
      try {
        const html2canvas = (await import('html2canvas')).default
        const el = document.querySelector('.view-panel') as HTMLElement
        if (!el) return
        addToast('Generating 2D image...')
        const canvas = await html2canvas(el, { backgroundColor: '#09090b', logging: false, scale: 2 })
        downloadUrl(canvas.toDataURL('image/png'), `citysketch-2d-${Date.now()}.png`)
      } catch (err) {
        console.error(err)
        addToast('Error exporting 2D view')
      }
    }
  }

  return (
    <header className="workspace-header">
      <div className="workspace-title-area">
        <h1 className="workspace-title">{title}</h1>
      </div>

      <div className="workspace-controls">
        {/* View toggles */}
        <div className="view-toggle-group">
          {viewOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setViewMode(opt.id)}
              className={`view-toggle ${viewMode === opt.id ? 'active' : ''}`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Utility buttons */}
        {layoutData && (
          <div className="workspace-utils">
            <button className="util-btn" onClick={handleCopyJSON} title="Copy JSON">
              <Copy size={15} strokeWidth={1.5} />
            </button>
            <div className="relative" ref={menuRef}>
              <button 
                className={`util-btn ${showExportMenu ? 'bg-zinc-800 text-white' : ''}`}
                onClick={() => setShowExportMenu(!showExportMenu)} 
                title="Download Options"
              >
                <Download size={15} strokeWidth={1.5} />
                <ChevronDown size={12} strokeWidth={2} style={{ marginLeft: 2, marginRight: -4, opacity: 0.7 }} />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-[120%] mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-1 px-2 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Save Image</div>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left" onClick={() => handleExportImage('2D')}>
                    <Grid3X3 size={14} /> 2D Map (PNG)
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left" onClick={() => handleExportImage('3D')}>
                    <Box size={14} /> 3D Snapshot (PNG)
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left" onClick={() => handleExportImage('BLUEPRINT')}>
                    <PenTool size={14} /> Blueprint (PNG)
                  </button>
                  <div className="mx-2 my-1 border-t border-zinc-800"></div>
                  <div className="p-1 px-2 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Developer</div>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left" onClick={handleExportJSON}>
                    <FileJson size={14} /> JSON Layout
                  </button>
                </div>
              )}
            </div>
            <button
              className="util-btn"
              title={isNightMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
              onClick={() => setNightMode(!isNightMode)}
            >
              {isNightMode ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
            </button>
            <button
              className="util-btn"
              title={isCanvasMaximized ? 'Minimize Workspace' : 'Maximize Workspace'}
              onClick={() => {
                setCanvasMaximized(!isCanvasMaximized)
              }}
            >
              {isCanvasMaximized ? <Minimize2 size={15} strokeWidth={1.5} /> : <Maximize2 size={15} strokeWidth={1.5} />}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
