import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { Activity, Leaf, Navigation, Route, Building2, Sparkles } from 'lucide-react'
import { calculateScores } from '../utils/scoring'

export function CityMetricsSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const layoutData = useStore((s) => s.layoutData)

  const metrics = useMemo(() => {
    if (!layoutData) return null
    const scoreData = calculateScores(layoutData)
    if (scoreData.totalCells === 0) return null
    return scoreData
  }, [layoutData])

  if (!metrics) return null

  const getBarColor = (type: string) => {
    switch(type) {
      case 'residential': return 'bg-blue-500'
      case 'commercial': return 'bg-amber-500'
      case 'hospital': return 'bg-red-500'
      case 'industrial': return 'bg-purple-500'
      case 'park': return 'bg-emerald-500'
      case 'road': return 'bg-zinc-500'
      case 'water': return 'bg-cyan-500'
      case 'school': return 'bg-purple-600'
      default: return 'bg-zinc-700'
    }
  }

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Toggle Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 shadow-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors pointer-events-auto"
        title="Toggle Data Density"
      >
        <Activity size={18} className={isOpen ? "text-blue-400" : ""} />
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-72 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/60 rounded-xl p-5 shadow-2xl flex flex-col gap-6 origin-top-right pointer-events-auto"
          >
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/80">
              <Activity size={14} className="text-zinc-400" />
              <h3 className="text-zinc-200 text-xs font-semibold tracking-wider uppercase">
                Urban Score Panel
              </h3>
            </div>

        {/* Liveability Summary */}
        <div className="flex flex-col gap-2 border border-zinc-800/70 rounded-lg p-3 bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Sparkles size={12} />
              <span className="text-[10px] uppercase font-medium tracking-wide">Liveability Summary</span>
            </div>
            <span className="text-xs font-medium text-blue-300">{metrics.metrics.liveability.display}</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${metrics.metrics.liveability.value}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>
          <span className="text-[10px] text-zinc-500 leading-4">
            {metrics.metrics.liveability.formula}
          </span>
        </div>

        {/* Heuristic Metrics */}
        <div className="grid grid-cols-1 gap-3">
          {[
            {
              key: 'sustainability',
              label: 'Sustainability',
              icon: Leaf,
              color: 'bg-emerald-500',
              value: metrics.metrics.sustainability.value,
              display: metrics.metrics.sustainability.display,
              formula: metrics.metrics.sustainability.formula,
            },
            {
              key: 'traffic',
              label: 'Traffic',
              icon: Route,
              color: 'bg-amber-500',
              value: metrics.metrics.traffic.value,
              display: metrics.metrics.traffic.display,
              formula: metrics.metrics.traffic.formula,
            },
            {
              key: 'walkability',
              label: 'Walkability',
              icon: Navigation,
              color: 'bg-cyan-500',
              value: metrics.metrics.walkability.value,
              display: metrics.metrics.walkability.display,
              formula: `${metrics.metrics.walkability.formula} | avg distance: ${metrics.metrics.walkability.averageDistance}`,
            },
            {
              key: 'density',
              label: 'Density',
              icon: Building2,
              color: 'bg-blue-500',
              value: metrics.metrics.density.value,
              display: metrics.metrics.density.display,
              formula: metrics.metrics.density.formula,
            },
          ].map((item) => (
            <div key={item.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <item.icon size={12} />
                  <span className="text-[10px] uppercase font-medium tracking-wide">{item.label}</span>
                </div>
                <span className="text-xs font-medium text-zinc-200">{item.display}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${item.color}`}
                />
              </div>
              <span className="text-[10px] text-zinc-500 leading-4">{item.formula}</span>
            </div>
          ))}
        </div>

        {/* Zoning Distribution */}
        <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800/50">
          <span className="text-zinc-400 text-[10px] uppercase font-medium tracking-wide mb-1">
            Zoning Distribution
          </span>
          
          {Object.entries(metrics.counts)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => {
              if (count === 0) return null
              const percentage = (count / metrics.totalCells) * 100
              
              return (
                <div key={type} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 capitalize">{type}</span>
                    <span className="text-zinc-500 font-mono text-[10px]">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${getBarColor(type)}`}
                    />
                  </div>
                </div>
              )
          })}
        </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
