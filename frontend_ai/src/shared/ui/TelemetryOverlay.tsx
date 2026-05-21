import { useEffect, useRef, useState } from 'react'

export function TelemetryOverlay({ visible = true, logToConsole = true, logIntervalMs = 5000, endpoint }: { visible?: boolean; logToConsole?: boolean; logIntervalMs?: number; endpoint?: string }) {
  const [fps, setFps] = useState(0)
  const [drawCalls, setDrawCalls] = useState(0)
  const [triangles, setTriangles] = useState(0)
  const [instances, setInstances] = useState(0)
  const last = useRef(performance.now())
  const frames = useRef(0)
  const lastLog = useRef(0)

  useEffect(() => {
    let raf = 0

    const tick = () => {
      frames.current++
      const now = performance.now()
      if (now - last.current >= 1000) {
        const fpsVal = Math.round((frames.current * 1000) / (now - last.current))
        setFps(fpsVal)
        frames.current = 0
        last.current = now

        // Keep the overlay safe even when mounted outside the R3F tree.
        setDrawCalls(0)
        setTriangles(0)
        setInstances(0)

        if (logToConsole && now - lastLog.current >= logIntervalMs) {
          lastLog.current = now
          const payload = { ts: new Date().toISOString(), fps: fpsVal, drawCalls: 0, triangles: 0, instanced: 0 }
          try { console.info('[Telemetry]', payload) } catch (e) { /* ignore */ }
          if (endpoint) {
            try {
              fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            } catch (e) { /* ignore network errors */ }
          }
        }
      }

      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [endpoint, logIntervalMs, logToConsole])

  if (!visible) return null

  return (
    <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 9999, color: '#e6eef6', fontSize: 12, fontFamily: 'Inter, Arial, sans-serif', background: 'rgba(6,8,15,0.6)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Telemetry</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
        <div style={{ opacity: 0.8 }}>FPS</div><div style={{ textAlign: 'right' }}>{fps}</div>
        <div style={{ opacity: 0.8 }}>Draw Calls</div><div style={{ textAlign: 'right' }}>{drawCalls}</div>
        <div style={{ opacity: 0.8 }}>Triangles</div><div style={{ textAlign: 'right' }}>{triangles}</div>
        <div style={{ opacity: 0.8 }}>Instanced</div><div style={{ textAlign: 'right' }}>{instances}</div>
      </div>
    </div>
  )
}

export default TelemetryOverlay
