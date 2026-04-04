export type ViewMode = '2D' | '3D' | 'CODE' | 'BLUEPRINT'

export interface GridCell {
  x: number
  y: number
  type: 'road' | 'residential' | 'commercial' | 'park' | 'hospital' | 'industrial' | 'water' | 'school' | 'empty'
  subtype?: string
  label?: string
  elevation?: number
  explanation?: string
}

export interface HistoryItem {
  id: string
  prompt: string
  timestamp: number
  layoutData: GridCell[][] | null
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
