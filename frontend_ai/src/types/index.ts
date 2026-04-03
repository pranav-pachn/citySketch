export type ViewMode = '2D' | '3D' | 'CODE' | 'BLUEPRINT'

export interface GridCell {
  x: number
  y: number
  type: 'road' | 'residential' | 'commercial' | 'park' | 'industrial' | 'water' | 'empty'
  subtype?: string
  label?: string
  elevation?: number
}

export interface HistoryItem {
  id: string
  prompt: string
  timestamp: number
  layoutData: GridCell[][] | null
}
