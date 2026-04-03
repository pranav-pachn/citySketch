import type { GridCell } from '../types'
import { calculateScores } from './scoring'

const makeGrid = (rows: number, cols: number, fill: GridCell['type'] = 'empty'): GridCell[][] => {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({ x, y, type: fill }))
  )
}

const setType = (grid: GridCell[][], x: number, y: number, type: GridCell['type']) => {
  grid[y][x] = { ...grid[y][x], type }
}

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message)
  }
}

const testEmptyGrid = () => {
  const result = calculateScores([])
  assert(result.totalCells === 0, 'empty grid should have 0 cells')
  assert(result.metrics.liveability.value === 0, 'empty grid liveability should be 0')
}

const testParkHeavyGridBoostsSustainability = () => {
  const grid = makeGrid(3, 3, 'park')
  const result = calculateScores(grid)
  assert(result.metrics.sustainability.value === 100, 'all-park grid should be 100 sustainability')
}

const testRoadHeavyGridRaisesTrafficRatio = () => {
  const grid = makeGrid(4, 4, 'road')
  setType(grid, 0, 0, 'residential')
  setType(grid, 1, 0, 'park')
  const result = calculateScores(grid)
  assert(result.metrics.traffic.value > 70, 'road-heavy grid should have high traffic ratio')
}

const testNearbyAmenityImprovesWalkability = () => {
  const grid = makeGrid(3, 3, 'empty')
  setType(grid, 0, 0, 'residential')
  setType(grid, 1, 0, 'park')
  setType(grid, 2, 2, 'hospital')
  const result = calculateScores(grid)
  assert(result.metrics.walkability.value >= 50, 'residential near amenities should improve walkability')
}

export const runUrbanScoringTests = () => {
  const tests = [
    { name: 'empty grid baseline', fn: testEmptyGrid },
    { name: 'park-heavy sustainability', fn: testParkHeavyGridBoostsSustainability },
    { name: 'road-heavy traffic ratio', fn: testRoadHeavyGridRaisesTrafficRatio },
    { name: 'amenity proximity walkability', fn: testNearbyAmenityImprovesWalkability },
  ]

  let passed = 0

  tests.forEach((testCase) => {
    testCase.fn()
    passed += 1
  })

  return {
    passed,
    total: tests.length,
  }
}
