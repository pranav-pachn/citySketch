export type ViewMode = '2D' | '3D' | 'CODE' | 'BLUEPRINT' | 'COMPARE'

export interface GridCell {
  x: number
  y: number
  type: 'road' | 'residential' | 'commercial' | 'park' | 'hospital' | 'industrial' | 'water' | 'school' | 'empty'
  subtype?: string
  label?: string
  elevation?: number
  explanation?: string
  isLocked?: boolean
}

export interface Explanation {
  message: string
  severity: 'critical' | 'warning' | 'good'
}

export interface Suggestion {
  action: string
  reason: string
  impact: string
}

export interface LayoutMetrics {
  hospitalDistance: number
  parkDistance: number
  commercialDistance: number
  schoolDistance: number
  greenCoverage: number
  roadCoverage: number
  roadConnectivity: number
  counts: Record<string, number>
}

export interface EvaluationData {
  score: number
  breakdown: {
    overall: number
    walkability: number
    healthcare: number
    traffic: number
    sustainability: number
  }
  // New structured fields from Explainable AI pipeline
  metrics?: LayoutMetrics
  explanations?: Explanation[]
  suggestions?: Suggestion[]
  summary?: string
  // Legacy flat string arrays (backward compat)
  insights?: string[]
  impactAnalysis?: string[]
}

export interface HistoryItem {
  id: string
  prompt: string
  timestamp: number
  layoutData: GridCell[][] | null
  evaluation?: EvaluationData
}

export interface NormalizedIntent {
  areaInAcres: number
  gridSize: number
  density: string
  trafficLevel: string
  eco: boolean
  smart: boolean
  usedFallback: boolean
}
