import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/entities/store/useStore'
import { Activity, Leaf, Navigation, Route, Sparkles, HeartPulse, AlertCircle, Lightbulb, Eye } from 'lucide-react'
import { calculateScores } from '@/shared/utils/scoring'

export function ScoreDashboard() {
  const [isOpen, setIsOpen] = useState(false)
  const evaluation = useStore((s) => s.evaluation)
  const layoutData = useStore((s) => s.layoutData)
  const highlightMode = useStore((s) => s.highlightMode)
  const setHighlightMode = useStore((s) => s.setHighlightMode)

  const displayEval = useMemo(() => {
    if (evaluation) return evaluation;
    if (layoutData) {
      const localScores = calculateScores(layoutData);
      if (localScores.totalCells === 0) return null;
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
      };
    }
    return null;
  }, [evaluation, layoutData]);

  if (!displayEval) return null

  const { score, breakdown, insights, suggestions } = displayEval

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Toggle Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 shadow-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors pointer-events-auto"
        title="Toggle Score Dashboard"
      >
        <Activity size={20} className={isOpen ? "text-blue-400" : ""} />
        {score && (
          <span className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-zinc-900">
            {score}
          </span>
        )}
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-80 max-h-[70vh] overflow-y-auto bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/60 rounded-xl px-6 py-6 shadow-2xl flex flex-col gap-6 origin-top-right pointer-events-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900/50"
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-400" />
                <h3 className="text-zinc-200 text-sm font-semibold tracking-wider uppercase">
                  City Intelligence
                </h3>
              </div>
              <span className="text-2xl font-black text-blue-400 drop-shadow-sm">{score}</span>
            </div>

            {/* Heuristic Metrics */}
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Score Breakdown</span>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: 'walkability', label: 'Walkability', icon: Navigation, color: 'bg-cyan-500', value: breakdown.walkability },
                  { key: 'traffic', label: 'Traffic Flow', icon: Route, color: 'bg-amber-500', value: breakdown.traffic },
                  { key: 'sustainability', label: 'Sustainability', icon: Leaf, color: 'bg-emerald-500', value: breakdown.sustainability },
                  { key: 'healthcare', label: 'Healthcare Access', icon: HeartPulse, color: 'bg-red-500', value: breakdown.healthcare },
                ].map((item) => (
                  <div key={item.key} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <item.icon size={12} />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-200">{item.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlight Toggle */}
            <button
              onClick={() => setHighlightMode(!highlightMode)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold transition-all ${
                highlightMode 
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Eye size={14} />
              {highlightMode ? 'Hide Visual Analysis' : 'Show Visual Analysis'}
            </button>

            {/* AI Insights & Suggestions */}
            {((insights && insights.length > 0) || (suggestions && suggestions.length > 0)) && (
              <div className="flex flex-col gap-4 pt-4 border-t border-zinc-800/50">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">AI Analysis</span>
                
                <div className="flex flex-col gap-3">
                  {insights && insights.map((insight, idx) => {
                    const isProblem = insight.toLowerCase().includes('too far') || insight.toLowerCase().includes('insufficient') || insight.toLowerCase().includes('low percentage') || insight.toLowerCase().includes('no healthcare') || insight.toLowerCase().includes('too much space');
                    return (
                      <div key={`insight-${idx}`} className={`flex gap-2 text-xs p-2 rounded-md bg-zinc-900/50 border ${isProblem ? 'border-red-500/20 text-red-200/90' : 'border-emerald-500/20 text-emerald-200/90'}`}>
                        {isProblem ? <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" /> : <Sparkles size={14} className="text-emerald-400 shrink-0 mt-0.5" />}
                        <span>{insight}</span>
                      </div>
                    )
                  })}
                  
                  {suggestions && suggestions.map((suggestion: any, idx) => (
                    <div key={`sugg-${idx}`} className="flex gap-2 text-xs p-2 rounded-md bg-blue-900/10 border border-blue-500/20 text-blue-200/90">
                      <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <span>{typeof suggestion === 'string' ? suggestion : suggestion.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
