export type ViewMode = '2D' | '3D' | 'CODE' | 'BLUEPRINT' | 'COMPARE'

export interface GridCell {
  x: number
  y: number
  type: 'road' | 'residential' | 'commercial' | 'park' | 'hospital' | 'industrial' | 'water' | 'school' | 'empty'
  subtype?: string
  label?: string
  elevation?: number
  explanation?: string
}

export interface EvaluationData {
  score: number
  breakdown: {
    overall: number
    walkability: number
    healthcare: number
    traffic: number
    sustainability: number
    metrics?: Record<string, any>
  }
  suggestions: string[]
  insights: string[]
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
