import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/entities/store/useStore'
import {
  Activity, Leaf, Navigation, Route, HeartPulse, Sparkles, Eye,
  AlertTriangle, AlertCircle, CheckCircle2, Lightbulb, ChevronRight,
  Zap, X, BarChart3, MessageSquare, Target
} from 'lucide-react'
import { calculateScores } from '@/shared/utils/scoring'
import type { Explanation, Suggestion, EvaluationData } from '@/entities/types'

export function InsightsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'suggestions'>('overview')
  const evaluation = useStore((s) => s.evaluation)
  const layoutData = useStore((s) => s.layoutData)
  const highlightMode = useStore((s) => s.highlightMode)
  const setHighlightMode = useStore((s) => s.setHighlightMode)

  // Merge server evaluation with local fallback
  const displayEval = useMemo(() => {
    if (evaluation) {
      // Backend returns an `evaluation` object with `.scores` and `.metrics`.
      // Normalize to the frontend's expected shape `{ score, breakdown, explanations, suggestions, summary, metrics }`.
      if ((evaluation as any).scores) {
        return {
          score: (evaluation as any).scores.overall,
          breakdown: (evaluation as any).scores,
          explanations: (evaluation as any).explanations || [],
          suggestions: (evaluation as any).suggestions || [],
          summary: (evaluation as any).summary || '',
          metrics: (evaluation as any).metrics || null,
        }
      }
      return evaluation
    }
    if (layoutData) {
      const localScores = calculateScores(layoutData)
      if (localScores.totalCells === 0) return null
      return {
        score: localScores.metrics.liveability.value,
        breakdown: {
          overall: localScores.metrics.liveability.value,
          walkability: localScores.metrics.walkability.value,
          traffic: localScores.metrics.traffic.value,
          sustainability: localScores.metrics.sustainability.value,
          healthcare: localScores.counts.hospital > 0 ? 70 : 10,
        },
        explanations: [] as Explanation[],
        suggestions: [] as Suggestion[],
        insights: [] as string[],
        summary: '',
      } as EvaluationData
    }
    return null
  }, [evaluation, layoutData])

  if (!displayEval) return null

  const score = (displayEval as any).score ?? 0
  const breakdown = (displayEval as any).breakdown ?? { overall: 0, walkability: 0, traffic: 0, sustainability: 0, healthcare: 0 }
  const explanations: Explanation[] = displayEval.explanations || []
  const suggestions: Suggestion[] = displayEval.suggestions || []
  const summary: string = displayEval.summary || ''

  // Derive severity counts for the badge
  const criticalCount = explanations.filter(e => e.severity === 'critical').length
  const warningCount = explanations.filter(e => e.severity === 'warning').length

  const getScoreColor = (val: number) => {
    if (val >= 80) return '#22c55e'
    if (val >= 60) return '#f59e0b'
    return '#ef4444'
  }

  const getScoreGradient = (val: number) => {
    if (val >= 80) return 'from-emerald-500/20 to-emerald-900/5'
    if (val >= 60) return 'from-amber-500/20 to-amber-900/5'
    return 'from-red-500/20 to-red-900/5'
  }

  const severityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle size={14} className="text-red-400 shrink-0" />
      case 'warning': return <AlertTriangle size={14} className="text-amber-400 shrink-0" />
      case 'good': return <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
      default: return <Sparkles size={14} className="text-blue-400 shrink-0" />
    }
  }

  const severityBorder = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500/30 bg-red-500/5'
      case 'warning': return 'border-amber-500/20 bg-amber-500/5'
      case 'good': return 'border-emerald-500/20 bg-emerald-500/5'
      default: return 'border-zinc-700/40 bg-zinc-800/30'
    }
  }

  const metricsList = [
    { key: 'walkability', label: 'Walkability', icon: Navigation, color: 'bg-cyan-500', value: breakdown.walkability },
    { key: 'traffic', label: 'Traffic Flow', icon: Route, color: 'bg-amber-500', value: breakdown.traffic },
    { key: 'sustainability', label: 'Sustainability', icon: Leaf, color: 'bg-emerald-500', value: breakdown.sustainability },
    { key: 'healthcare', label: 'Healthcare', icon: HeartPulse, color: 'bg-red-500', value: breakdown.healthcare },
  ]

  const tabs = [
    { id: 'overview' as const, label: 'Score', icon: BarChart3 },
    { id: 'insights' as const, label: 'Insights', icon: MessageSquare, badge: criticalCount + warningCount || undefined },
    { id: 'suggestions' as const, label: 'Actions', icon: Target, badge: suggestions.length || undefined },
  ]

  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-3 pointer-events-none" style={{ maxHeight: 'calc(100% - 32px)' }}>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 shadow-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors pointer-events-auto"
        title="Toggle Insights Panel"
      >
        <Activity size={20} className={isOpen ? 'text-blue-400' : ''} />
        {score && (
          <span
            className="absolute -bottom-1 -right-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-zinc-900"
            style={{ backgroundColor: getScoreColor(score) }}
          >
            {score}
          </span>
        )}
        {/* Alert badge for critical issues */}
        {!isOpen && criticalCount > 0 && (
          <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-zinc-900">
            {criticalCount}
          </span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="insights-panel w-[340px] max-h-[calc(100vh-180px)] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/60 rounded-2xl shadow-2xl flex flex-col origin-top-right pointer-events-auto overflow-hidden"
          >
            {/* Header with Score */}
            <div className={`insights-panel-header bg-gradient-to-br ${getScoreGradient(score)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-400" />
                  <h3 className="text-zinc-200 text-xs font-bold tracking-wider uppercase">City Intelligence</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Big Score */}
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black" style={{ color: getScoreColor(score) }}>{score}</span>
                <span className="text-zinc-500 text-sm font-medium mb-1">/ 100</span>
              </div>

              {/* Summary Line */}
              {summary && (
                <p className="text-zinc-400 text-xs leading-relaxed mt-3">{summary}</p>
              )}
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-zinc-800/50 px-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all relative ${
                    activeTab === tab.id
                      ? 'text-blue-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="bg-zinc-700 text-zinc-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">{tab.badge}</span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div layoutId="insights-tab-underline" className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto styled-scrollbar px-5 py-4">
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Score Breakdown */}
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Score Breakdown</span>
                    <div className="flex flex-col gap-3">
                      {metricsList.map(item => (
                        <div key={item.key} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-zinc-400">
                              <item.icon size={12} />
                              <span className="text-xs font-medium">{item.label}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ color: getScoreColor(item.value) }}>{item.value}</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                              className={`h-full rounded-full ${item.color}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Highlight Toggle */}
                    <button
                      onClick={() => setHighlightMode(!highlightMode)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-semibold transition-all mt-2 ${
                        highlightMode
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      <Eye size={14} />
                      {highlightMode ? 'Hide Visual Analysis' : 'Show Visual Analysis'}
                    </button>

                    {/* Raw Metrics (collapsible) */}
                    {displayEval.metrics && (
                      <MetricsDetail metrics={displayEval.metrics} />
                    )}
                  </motion.div>
                )}

                {activeTab === 'insights' && (
                  <motion.div
                    key="insights"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col gap-3"
                  >
                    {explanations.length === 0 ? (
                      <p className="text-zinc-500 text-xs text-center py-8">Generate a layout to see AI insights</p>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                          {explanations.length} Planning Insights
                        </span>
                        {explanations.map((exp, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-2.5 text-xs p-3 rounded-lg border transition-colors ${severityBorder(exp.severity)}`}
                          >
                            <div className="mt-0.5">{severityIcon(exp.severity)}</div>
                            <span className="text-zinc-200 leading-relaxed">{exp.message}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}

                {activeTab === 'suggestions' && (
                  <motion.div
                    key="suggestions"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex flex-col gap-3"
                  >
                    {suggestions.length === 0 ? (
                      <p className="text-zinc-500 text-xs text-center py-8">No improvement suggestions — layout looks good!</p>
                    ) : (
                      <>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                          {suggestions.length} Improvement Actions
                        </span>
                        {suggestions.map((sugg, idx) => (
                          <div
                            key={idx}
                            className="border border-blue-500/20 bg-blue-500/5 rounded-lg p-3 flex flex-col gap-2 hover:bg-blue-500/10 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <Lightbulb size={14} className="text-amber-400 shrink-0 mt-0.5" />
                              <span className="text-xs font-semibold text-zinc-100 leading-relaxed">{sugg.action}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed pl-5">{sugg.reason}</p>
                            <div className="flex items-center gap-1.5 pl-5">
                              <Zap size={11} className="text-emerald-400" />
                              <span className="text-[11px] font-bold text-emerald-400">{sugg.impact}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Collapsible raw metrics detail section
 */
function MetricsDetail({ metrics }: { metrics: any }) {
  const [open, setOpen] = useState(false)

  const items = [
    { label: 'Avg Hospital Distance', value: metrics.hospitalDistance === Infinity ? '∞' : `${metrics.hospitalDistance} blocks`, warn: metrics.hospitalDistance > 6 },
    { label: 'Avg Park Distance', value: metrics.parkDistance === Infinity ? '∞' : `${metrics.parkDistance} blocks`, warn: metrics.parkDistance > 4 },
    { label: 'Avg Commercial Distance', value: metrics.commercialDistance === Infinity ? '∞' : `${metrics.commercialDistance} blocks`, warn: metrics.commercialDistance > 5 },
    { label: 'Green Coverage', value: `${metrics.greenCoverage}%`, warn: metrics.greenCoverage < 10 },
    { label: 'Road Coverage', value: `${metrics.roadCoverage}%`, warn: metrics.roadCoverage < 8 || metrics.roadCoverage > 30 },
    { label: 'Road Connectivity', value: `${metrics.roadConnectivity}%`, warn: metrics.roadConnectivity < 70 },
  ]

  return (
    <div className="border border-zinc-800/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
      >
        <span>Raw Metrics</span>
        <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">{item.label}</span>
                  <span className={item.warn ? 'text-amber-400 font-semibold' : 'text-zinc-300'}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
