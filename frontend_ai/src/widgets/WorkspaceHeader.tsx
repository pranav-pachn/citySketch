import { useState, useRef, useEffect } from 'react'
import { useStore } from '@/entities/store/useStore'
import { Grid3X3, Box, Code, Maximize2, Copy, Download, Moon, Sun, Minimize2, PenTool, FileJson, ChevronDown, Save, FileText, SplitSquareHorizontal, RefreshCw } from 'lucide-react'
import type { ViewMode, EvaluationData } from '@/entities/types'
import { calculateScores } from '@/shared/utils/scoring'

const viewOptions: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: '2D', label: '2D', icon: <Grid3X3 size={14} strokeWidth={1.5} /> },
  { id: '3D', label: '3D', icon: <Box size={14} strokeWidth={1.5} /> },
  { id: 'BLUEPRINT', label: 'Blueprint', icon: <PenTool size={14} strokeWidth={1.5} /> },
  { id: 'CODE', label: 'Code', icon: <Code size={14} strokeWidth={1.5} /> },
  { id: 'COMPARE', label: 'Compare', icon: <SplitSquareHorizontal size={14} strokeWidth={1.5} /> },
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
  const saveCurrentLayout = useStore((s) => s.saveCurrentLayout)
  const evaluation = useStore((s) => s.evaluation)
  const regeneratePrompt = useStore((s) => s.regeneratePrompt)

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
    const exportData = {
      layoutData,
      evaluation,
      prompt: title,
      timestamp: Date.now()
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
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
        window.dispatchEvent(new Event('citysketch:export-blueprint'))
        setShowExportMenu(false)
      } else {
        addToast('Please switch to Blueprint view to capture')
      }
    } else if (mode === '2D') {
      try {
        const html2canvas = (await import('html2canvas')).default
        const el = document.querySelector('.grid-2d-wrapper') as HTMLElement
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

  const handleExportPDF = async () => {
    if (!layoutData) return
    try {
      addToast('Generating PDF report...')
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      let y = 20
      
      doc.setFontSize(22)
      doc.setTextColor(0)
      doc.text('CitySketch Evaluation Report', 20, y)
      y += 10
      
      doc.setFontSize(12)
      doc.setTextColor(100)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y)
      doc.text(`Prompt: ${title}`, 20, y + 6)
      y += 20
      
      const displayEval = evaluation || (layoutData ? { 
        score: calculateScores(layoutData).metrics.liveability.value, 
        breakdown: {
          overall: calculateScores(layoutData).metrics.liveability.value,
          walkability: calculateScores(layoutData).metrics.walkability.value,
          traffic: calculateScores(layoutData).metrics.traffic.value,
          sustainability: calculateScores(layoutData).metrics.sustainability.value,
          healthcare: calculateScores(layoutData).counts.hospital > 0 ? 70 : 10
        }, 
        insights: [], 
        suggestions: [],
        explanations: [],
        summary: ''
      } as EvaluationData : null)
      
      if (displayEval) {
        doc.setFontSize(16)
        doc.setTextColor(0)
        doc.text(`Overall Score: ${displayEval.score}/100`, 20, y)
        y += 10
        
        doc.setFontSize(14)
        doc.text('Metrics Breakdown:', 20, y)
        y += 8
        doc.setFontSize(12)
        doc.text(`- Walkability: ${displayEval.breakdown.walkability}`, 25, y)
        doc.text(`- Traffic Flow: ${displayEval.breakdown.traffic}`, 25, y + 6)
        doc.text(`- Sustainability: ${displayEval.breakdown.sustainability}`, 25, y + 12)
        doc.text(`- Healthcare Access: ${displayEval.breakdown.healthcare}`, 25, y + 18)
        y += 30
        
        // Explanations / Insights section
        const explanations = displayEval.explanations || []
        const legacyInsights = displayEval.insights || []
        const insightItems = explanations.length > 0
          ? explanations.map((e: any) => {
              const prefix = e.severity === 'critical' ? '⚠ ' : e.severity === 'good' ? '✓ ' : '• '
              return prefix + e.message
            })
          : legacyInsights

        if (insightItems.length > 0) {
          doc.setFontSize(14)
          doc.text('Planning Insights:', 20, y)
          y += 8
          doc.setFontSize(11)
          insightItems.forEach((insight: string) => {
            if (y > 270) { doc.addPage(); y = 20; }
            const lines = doc.splitTextToSize(insight, 170)
            doc.text(lines, 25, y)
            y += lines.length * 5 + 1
          })
          y += 5
        }
        
        // Structured Suggestions section
        const suggestions = displayEval.suggestions || []
        if (suggestions.length > 0) {
          if (y > 230) { doc.addPage(); y = 20; }
          doc.setFontSize(14)
          doc.text('Improvement Actions:', 20, y)
          y += 8
          doc.setFontSize(11)
          suggestions.forEach((sugg: any) => {
            if (y > 260) { doc.addPage(); y = 20; }
            // Handle both structured { action, reason, impact } and legacy string format
            if (typeof sugg === 'string') {
              const lines = doc.splitTextToSize(`• ${sugg}`, 170)
              doc.text(lines, 25, y)
              y += lines.length * 5
            } else {
              const actionLines = doc.splitTextToSize(`→ ${sugg.action}`, 165)
              doc.setTextColor(0)
              doc.text(actionLines, 25, y)
              y += actionLines.length * 5
              
              doc.setTextColor(100)
              const reasonLines = doc.splitTextToSize(`  Reason: ${sugg.reason}`, 160)
              doc.text(reasonLines, 28, y)
              y += reasonLines.length * 5
              
              doc.setTextColor(34, 139, 34)
              doc.text(`  Impact: ${sugg.impact}`, 28, y)
              doc.setTextColor(0)
              y += 8
            }
          })
          y += 10
        }
      }
      
      if (viewMode === '2D') {
        const el = document.querySelector('.grid-2d-wrapper') as HTMLElement
        if (el) {
          if (y > 160) { doc.addPage(); y = 20; }
          doc.setFontSize(14)
          doc.setTextColor(0)
          doc.text('Layout Snapshot:', 20, y)
          y += 10
          const canvas = await html2canvas(el, { backgroundColor: '#09090b', logging: false, scale: 2 })
          const imgData = canvas.toDataURL('image/jpeg', 0.9)
          const imgWidth = 170
          const imgHeight = (canvas.height * imgWidth) / canvas.width
          doc.addImage(imgData, 'JPEG', 20, y, imgWidth, imgHeight)
        }
      } else {
        doc.setFontSize(11)
        doc.setTextColor(150)
        doc.text('(Switch to 2D view before exporting to include a visual layout snapshot)', 20, y)
      }
      
      doc.save(`citysketch-report-${Date.now()}.pdf`)
      addToast('PDF Report exported successfully')
      setShowExportMenu(false)
    } catch (err) {
      console.error(err)
      addToast('Error generating PDF report')
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
            <button className="util-btn" onClick={saveCurrentLayout} title="Save to history">
              <Save size={15} strokeWidth={1.5} />
            </button>
            <button className="util-btn" onClick={() => regeneratePrompt?.()} title="Regenerate alternative">
              <RefreshCw size={15} strokeWidth={1.5} />
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
                  <div className="p-1 px-2 text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Reports</div>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left" onClick={handleExportPDF}>
                    <FileText size={14} /> PDF Report
                  </button>
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
