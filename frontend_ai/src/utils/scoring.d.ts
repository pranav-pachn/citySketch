import type { GridCell } from '../types'

export function calcSustainability(grid: GridCell[][] | null | undefined): string
export function calcTraffic(grid: GridCell[][] | null | undefined): string
export function calcWalkability(grid: GridCell[][] | null | undefined): string
export function calculateScores(grid: GridCell[][] | null | undefined): {
  sustainability: string
  traffic: string
  walkability: string
}
