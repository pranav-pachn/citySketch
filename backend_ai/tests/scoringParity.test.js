import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateScores as frontendCalculateScores } from '../../frontend_ai/src/shared/utils/scoring.js'
import { calculateScores as backendCalculateScores } from '../src/services/scoringEngine.js'
import { analyzeLayout } from '../src/services/analyzer.js'

function cell(x, y, type) {
  return { x, y, type }
}

function gridFromRows(rows) {
  return rows.map((row, y) => row.map((type, x) => cell(x, y, type)))
}

function toSharedMetrics(result) {
  if ('metrics' in result && result.metrics && 'liveability' in result.metrics) {
    return {
      totalCells: result.totalCells,
      counts: result.counts,
      sustainability: result.metrics.sustainability.value,
      traffic: result.metrics.traffic.value,
      walkability: result.metrics.walkability.value,
      density: result.metrics.density.value,
      liveability: result.metrics.liveability.value,
      averageDistance: result.metrics.walkability.averageDistance,
    }
  }

  return {
    totalCells: result.metrics?.totalCells ?? 0,
    counts: result.metrics ?? {},
    sustainability: result.sustainability,
    traffic: result.traffic,
    walkability: result.walkability,
    density: result.metrics?.density ?? 0,
    liveability: result.overall,
    averageDistance: result.distances?.walkability ?? 0,
  }
}

function expectedBackendOverall(grid) {
  const frontend = frontendCalculateScores(grid)
  const analysis = analyzeLayout(grid)

  const walkability = frontend.metrics.walkability.value
  const traffic = frontend.metrics.traffic.value
  const sustainability = frontend.metrics.sustainability.value

  let healthcare = 100
  if (analysis.counts.residential > 0) {
    if (analysis.counts.hospital === 0) {
      healthcare = 0
    } else {
      healthcare = Math.max(0, 100 - ((analysis.hospitalDistance - 3) * (100 / 17)))
      healthcare = Math.max(0, Math.min(100, healthcare))
    }
  }

  return Math.round(0.3 * walkability + 0.25 * healthcare + 0.25 * traffic + 0.2 * sustainability)
}

function assertCommonParity(grid, label) {
  const frontend = frontendCalculateScores(grid)
  const backend = backendCalculateScores(grid)

  assert.equal(backend.walkability, frontend.metrics.walkability.value, `${label}: walkability mismatch`)
  assert.equal(backend.traffic, frontend.metrics.traffic.value, `${label}: traffic mismatch`)
  assert.equal(backend.sustainability, frontend.metrics.sustainability.value, `${label}: sustainability mismatch`)
  assert.equal(backend.metrics.parkCount, frontend.counts.park, `${label}: park count mismatch`)
  assert.equal(backend.metrics.hospitalCount, frontend.counts.hospital, `${label}: hospital count mismatch`)
  assert.equal(backend.metrics.residentialCount, frontend.counts.residential, `${label}: residential count mismatch`)
  const frontendRoadRatio = frontend.totalCells > 0 ? frontend.counts.road / frontend.totalCells : 0
  assert.ok(Math.abs(backend.metrics.roadRatio - frontendRoadRatio) < 0.001, `${label}: road ratio mismatch`)

  const expectedOverall = expectedBackendOverall(grid)
  assert.equal(backend.overall, expectedOverall, `${label}: backend overall mismatch`)

  return { frontend, backend }
}

test('empty grid keeps frontend/backend scores aligned', () => {
  const grid = []
  const { frontend, backend } = assertCommonParity(grid, 'empty grid')

  assert.equal(frontend.metrics.liveability.value, 0)
  assert.equal(backend.overall, 25)
})

test('balanced neighborhood stays in parity', () => {
  const grid = gridFromRows([
    ['road', 'road', 'road'],
    ['residential', 'park', 'empty'],
    ['hospital', 'road', 'empty'],
  ])

  const { frontend, backend } = assertCommonParity(grid, 'balanced neighborhood')

  assert.equal(frontend.metrics.walkability.averageDistance, 1)
  assert.equal(backend.distances.healthcare, 1)
  assert.equal(backend.labels.walkability.label, 'Excellent')
})

test('car-dependent grid still produces matching shared scores', () => {
  const grid = gridFromRows([
    ['road', 'road', 'road', 'road'],
    ['residential', 'empty', 'empty', 'residential'],
    ['empty', 'empty', 'park', 'empty'],
    ['empty', 'empty', 'empty', 'empty'],
  ])

  const { frontend, backend } = assertCommonParity(grid, 'car-dependent grid')

  assert.equal(frontend.metrics.sustainability.value > 0, true)
  assert.equal(backend.overall >= 0, true)
})
