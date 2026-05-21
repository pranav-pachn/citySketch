import React from 'react'
import { useStore } from '@/entities/store/useStore'

export default function ExportControls() {
  const layoutData = useStore(s => s.layoutData)

  const downloadJSON = () => {
    if (!layoutData) return
    const blob = new Blob([JSON.stringify({ layout: layoutData }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `city_layout_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadPNG = async () => {
    try {
      // Find the three.js canvas inside the scene wrapper
      const canvas = document.querySelector('.scene-3d-wrapper canvas') as HTMLCanvasElement | null
      if (!canvas) return alert('Canvas not found')
      // Use toDataURL to capture PNG
      const dataUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `city_snapshot_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      console.error('Export PNG failed', err)
      alert('Export failed: ' + (err?.message || err))
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={downloadJSON} className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-900/80 border border-zinc-800/50 text-zinc-200 hover:bg-zinc-800/80">Export JSON</button>
      <button onClick={downloadPNG} className="px-3 py-1 text-xs font-medium rounded-md bg-zinc-900/80 border border-zinc-800/50 text-zinc-200 hover:bg-zinc-800/80">Export PNG</button>
    </div>
  )
}
