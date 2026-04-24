import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { calculateScores } from '../utils/scoring'
import { Activity, Leaf, Navigation, Route, HeartPulse, Check, X, SplitSquareHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'

export function CompareView() {
  const layoutData = useStore((s) => s.layoutData)
  const evaluation = useStore((s) => s.evaluation)
  const history = useStore((s) => s.history)
  const compareHistoryId = useStore((s) => s.compareHistoryId)
  const setCompareHistoryId = useStore((s) => s.setCompareHistoryId)

  // Plan A (Current)
  const planA = useMemo(() => {
    if (!layoutData) return null
    if (evaluation) return evaluation
    
    // Fallback to local scoring if no AI evaluation
    const localScores = calculateScores(layoutData)
    return {
      score: localScores.metrics.liveability.value,
      breakdown: {
        walkability: localScores.metrics.walkability.value,
        traffic: localScores.metrics.traffic.value,
        sustainability: localScores.metrics.sustainability.value,
        healthcare: localScores.counts.hospital > 0 ? 70 : 10
      },
      insights: [],
      suggestions: []
    }
  }, [layoutData, evaluation])

  // Plan B (Compare target)
  const planB = useMemo(() => {
    if (!compareHistoryId) return null
    const historyItem = history.find(h => h.id === compareHistoryId)
    if (!historyItem || !historyItem.layoutData) return null
    
    if (historyItem.evaluation) return historyItem.evaluation
    
    // Fallback to local scoring
    const localScores = calculateScores(historyItem.layoutData)
    return {
      score: localScores.metrics.liveability.value,
      breakdown: {
        walkability: localScores.metrics.walkability.value,
        traffic: localScores.metrics.traffic.value,
        sustainability: localScores.metrics.sustainability.value,
        healthcare: localScores.counts.hospital > 0 ? 70 : 10
      },
      insights: [],
      suggestions: []
    }
  }, [compareHistoryId, history])

  if (!planA) return null

  const getMetricColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400'
    if (val >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const getDeltaDisplay = (valA: number, valB: number | undefined) => {
    if (valB === undefined) return null
    const delta = valA - valB
    if (delta > 0) return <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded ml-2">+{delta}</span>
    if (delta < 0) return <span className="text-red-400 text-xs font-bold bg-red-400/10 px-1.5 py-0.5 rounded ml-2">{delta}</span>
    return <span className="text-zinc-500 text-xs font-bold ml-2">Same</span>
  }

  const metricsList = [
    { key: 'walkability', label: 'Walkability', icon: Navigation },
    { key: 'traffic', label: 'Traffic Flow', icon: Route },
    { key: 'sustainability', label: 'Sustainability', icon: Leaf },
    { key: 'healthcare', label: 'Healthcare Access', icon: HeartPulse },
  ]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full flex flex-col items-center justify-center p-8 overflow-y-auto styled-scrollbar"
    >
      <div className="w-full max-w-5xl bg-zinc-950/80 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <SplitSquareHorizontal className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-white">Scenario Comparison</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
          
          {/* PLAN A (Left) */}
          <div className="p-8 flex flex-col gap-8 bg-zinc-900/20">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-blue-400">Current Layout</span>
              <h3 className="text-3xl font-black text-white">Plan A</h3>
            </div>

            <div className="flex items-end gap-3">
              <div className="flex flex-col">
                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Overall Score</span>
                <span className={`text-5xl font-black ${getMetricColor(planA.score)}`}>{planA.score}</span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-2">Metrics</h4>
              {metricsList.map(m => {
                const valA = planA.breakdown[m.key as keyof typeof planA.breakdown]
                return (
                  <div key={m.key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <m.icon size={16} />
                        <span className="text-sm font-medium">{m.label}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`text-lg font-bold ${getMetricColor(valA)}`}>{valA}</span>
                        {planB && getDeltaDisplay(valA, planB.breakdown[m.key as keyof typeof planB.breakdown])}
                      </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, valA))}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PLAN B (Right) */}
          <div className="p-8 flex flex-col gap-8 bg-zinc-900/40 relative">
            
            <div className="flex flex-col gap-3">
              <span className="text-xs uppercase tracking-widest font-bold text-amber-500">Compare Against</span>
              
              <select 
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none shadow-inner"
                value={compareHistoryId || ''}
                onChange={(e) => setCompareHistoryId(e.target.value || null)}
              >
                <option value="">-- Select a historical layout --</option>
                {history.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.prompt.length > 40 ? h.prompt.substring(0, 40) + '...' : h.prompt} ({new Date(h.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {!planB ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 min-h-[300px]">
                <SplitSquareHorizontal size={48} className="opacity-20" />
                <p className="text-sm">Select a layout from history to compare</p>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-3">
                  <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Overall Score</span>
                    <span className={`text-5xl font-black ${getMetricColor(planB.score)}`}>{planB.score}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-2">Metrics</h4>
                  {metricsList.map(m => {
                    const valB = planB.breakdown[m.key as keyof typeof planB.breakdown]
                    return (
                      <div key={m.key} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <m.icon size={16} />
                            <span className="text-sm font-medium">{m.label}</span>
                          </div>
                          <span className={`text-lg font-bold ${getMetricColor(valB)}`}>{valB}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(100, valB))}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            
          </div>

        </div>
      </div>
    </motion.div>
  )
}
