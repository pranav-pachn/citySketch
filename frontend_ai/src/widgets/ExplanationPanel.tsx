import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Lightbulb, MousePointerClick, X } from 'lucide-react'

interface ExplanationPanelProps {
  explanation: string
  onClose: () => void
}

export function ExplanationPanel({ explanation, onClose }: ExplanationPanelProps) {
  return (
    <AnimatePresence>
      {/* 
        Flex-row side panel — sits BESIDE the grid, never overlaps it.
        Width animates from 0→300px so the canvas naturally shrinks to make room.
      */}
      <motion.aside
        key="explanation-side-panel"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 300, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{ overflow: 'hidden', flexShrink: 0 }}
        className="explanation-side-panel-wrapper"
      >
        <div className="explanation-side-panel">
          <div className="explanation-side-inner">

            {/* Header */}
            <div className="explanation-side-header">
              <div className="flex items-center gap-2">
                <div className="explanation-brain-icon">
                  <Brain size={14} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="explanation-label-tag">AI Analysis</div>
                  <div className="explanation-panel-title">Planning Rationale</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="explanation-close-btn"
                aria-label="Close explanation panel"
              >
                <X size={14} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="explanation-side-body styled-scrollbar">

              {/* Active cell reason */}
              <div className="explanation-card explanation-card--blue">
                <div className="explanation-card-accent" />
                <div className="explanation-card-inner">
                  <div className="explanation-card-label">
                    <span className="explanation-dot explanation-dot--blue" />
                    Selected Cell Reason
                  </div>
                  <p className="explanation-card-text">
                    {explanation || 'Click any cell in the grid to see the AI planning rationale behind that zone placement.'}
                  </p>
                </div>
              </div>

              {/* Why this exists */}
              <div className="explanation-card explanation-card--zinc">
                <div className="explanation-card-label explanation-card-label--muted">
                  <Lightbulb size={13} strokeWidth={1.8} className="text-zinc-500" />
                  Why This Exists
                </div>
                <p className="explanation-card-text explanation-card-text--muted">
                  This panel reads the city like an <span className="text-zinc-200 font-medium">urban-planning sketch</span>, translating each zone placement into a clear decision.
                </p>
              </div>

              {/* Interaction hint */}
              <div className="explanation-card explanation-card--zinc">
                <div className="explanation-card-label explanation-card-label--muted">
                  <MousePointerClick size={13} strokeWidth={1.8} className="text-zinc-500" />
                  Interaction Hint
                </div>
                <p className="explanation-card-text explanation-card-text--muted">
                  Click different cells in the <span className="explanation-badge">2D grid</span> to compare why homes, parks, roads, and hospitals were placed where they are.
                </p>
              </div>

            </div>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
