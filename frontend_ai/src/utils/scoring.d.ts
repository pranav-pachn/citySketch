import type { GridCell } from '../types'

export function calcSustainability(grid: GridCell[][] | null | undefined): string
export function calcTraffic(grid: GridCell[][] | null | undefined): string
export function calcWalkability(grid: GridCell[][] | null | undefined): string
export interface UrbanMetric {
  value: number
  display: string
  formula: string
}

export interface WalkabilityMetric extends UrbanMetric {
  averageDistance: number
}

export function calculateScores(grid: GridCell[][] | null | undefined): {
  totalCells: number
  counts: {
    residential: number
    commercial: number
    hospital: number
    industrial: number
    park: number
    road: number
    water: number
    empty: number
  }
  metrics: {
    sustainability: UrbanMetric
    traffic: UrbanMetric
    walkability: WalkabilityMetric
    density: UrbanMetric
    liveability: UrbanMetric
  }
}
