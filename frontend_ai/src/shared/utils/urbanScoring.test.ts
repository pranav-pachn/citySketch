import type { GridCell } from '@/entities/types'
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

// ── Existing tests ──

const testEmptyGrid = () => {
  const result = calculateScores([])
  assert(result.totalCells === 0, 'empty grid should have 0 cells')
  assert(result.metrics.liveability.value === 0, 'empty grid liveability should be 0')
}

const testParkHeavyGridBoostsSustainability = () => {
  const grid = makeGrid(3, 3, 'park')
  const result = calculateScores(grid)
  // Guide formula: (park/total) × 100 × 3.5 → 9/9 × 100 × 3.5 = 350 → clamped to 100
  assert(result.metrics.sustainability.value === 100, 'all-park grid should be 100 sustainability')
}

const testRoadHeavyGridRaisesTrafficRatio = () => {
  const grid = makeGrid(4, 4, 'road')
  setType(grid, 0, 0, 'residential')
  setType(grid, 1, 0, 'park')
  const result = calculateScores(grid)
  // Guide formula: 100 - (road/total) × 200 → 100 - (14/16)*200 = 100 - 175 = -75 → clamped to 0
  // So traffic score should be LOW (0) because lots of roads is bad
  assert(result.metrics.traffic.value === 0, 'road-heavy grid should have 0 traffic score (lots of roads = bad)')
}

const testNearbyAmenityImprovesWalkability = () => {
  const grid = makeGrid(3, 3, 'empty')
  setType(grid, 0, 0, 'residential')
  setType(grid, 1, 0, 'park')
  setType(grid, 2, 2, 'hospital')
  const result = calculateScores(grid)
  // Guide formula: max(0, 100 - avgDist × 5)
  // Residential at (0,0), nearest park at (1,0), distance = 1
  // walkability = max(0, 100 - 1 * 5) = 95
  assert(result.metrics.walkability.value >= 50, 'residential near amenities should improve walkability')
}

// ── Guide-aligned new tests ──

const testTrafficFormulaInverted = () => {
  // Fewer roads = higher traffic score
  const grid = makeGrid(5, 5, 'residential')
  setType(grid, 2, 0, 'road')
  setType(grid, 2, 1, 'road')
  setType(grid, 2, 2, 'road')
  setType(grid, 2, 3, 'road')
  setType(grid, 2, 4, 'road')
  const result = calculateScores(grid)
  // 5 roads out of 25 → 100 - (5/25)*200 = 100 - 40 = 60
  assert(result.metrics.traffic.value >= 50, 'few roads should yield decent traffic score')
}

const testDensityExcludesRoads = () => {
  const grid = makeGrid(4, 4, 'road')
  setType(grid, 0, 0, 'residential')
  setType(grid, 1, 0, 'residential')
  setType(grid, 0, 1, 'residential')
  const result = calculateScores(grid)
  // Guide formula: residential / (total - road) × 100
  // 3 residential, 13 road, total = 16, non-road = 3
  // density = (3 / 3) × 100 = 100
  assert(result.metrics.density.value === 100, 'density should be 100% when all non-road cells are residential')
}

const testSchoolInDistribution = () => {
  const grid = makeGrid(3, 3, 'empty')
  setType(grid, 0, 0, 'school')
  setType(grid, 1, 1, 'school')
  const result = calculateScores(grid)
  assert(result.counts.school === 2, 'should count 2 school cells')
}

const testLiveabilityComposite = () => {
  // Just ensure it produces a number in range
  const grid = makeGrid(5, 5, 'empty')
  setType(grid, 0, 0, 'residential')
  setType(grid, 1, 0, 'park')
  setType(grid, 2, 0, 'road')
  const result = calculateScores(grid)
  assert(result.metrics.liveability.value >= 0, 'liveability should be >= 0')
  assert(result.metrics.liveability.value <= 100, 'liveability should be <= 100')
}

export const runUrbanScoringTests = () => {
  const tests = [
    { name: 'empty grid baseline', fn: testEmptyGrid },
    { name: 'park-heavy sustainability', fn: testParkHeavyGridBoostsSustainability },
    { name: 'road-heavy traffic ratio', fn: testRoadHeavyGridRaisesTrafficRatio },
    { name: 'amenity proximity walkability', fn: testNearbyAmenityImprovesWalkability },
    { name: 'traffic formula inverted (guide)', fn: testTrafficFormulaInverted },
    { name: 'density excludes roads (guide)', fn: testDensityExcludesRoads },
    { name: 'school in distribution', fn: testSchoolInDistribution },
    { name: 'liveability composite', fn: testLiveabilityComposite },
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
