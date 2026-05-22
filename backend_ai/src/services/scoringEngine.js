import { calculateScores as unifiedCalculateScores, getScoreCategory, getScoreLabel } from '../../../utils/scoring.js'
import { analyzeLayout } from './analyzer.js'

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)) }

function getCellType(cell) {
  return cell && typeof cell === 'object' ? cell.type : cell
}

function getDimensions(grid) {
  const height = Array.isArray(grid) ? grid.length : 0
  const width = height > 0 && Array.isArray(grid[0]) ? grid[0].length : 0
  return { width, height }
}

function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function nearestDistance(grid, sourceCell, targetTypes) {
  let nearest = Number.POSITIVE_INFINITY
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      const cell = grid[y][x]
      if (!cell || !targetTypes.has(getCellType(cell))) continue
      const distance = manhattanDistance(sourceCell, cell)
      if (distance < nearest) nearest = distance
    }
  }
  return nearest
}

function countRoadComponents(grid) {
  const visited = new Set()
  let totalRoadCells = 0
  let largestComponent = 0
  const neighborOffsets = [[1,0], [-1,0], [0,1], [0,-1]]

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (getCellType(grid[y][x]) !== 'road') continue
      totalRoadCells += 1
    }
  }

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid[y].length; x += 1) {
      if (getCellType(grid[y][x]) !== 'road' || visited.has(`${x},${y}`)) continue
      const queue = [{ x, y }]
      visited.add(`${x},${y}`)
      let size = 0

      while (queue.length > 0) {
        const current = queue.pop()
        size += 1

        for (const [dx, dy] of neighborOffsets) {
          const nx = current.x + dx
          const ny = current.y + dy
          if (!grid[ny] || !grid[ny][nx]) continue
          if (getCellType(grid[ny][nx]) !== 'road') continue
          const key = `${nx},${ny}`
          if (visited.has(key)) continue
          visited.add(key)
          queue.push({ x: nx, y: ny })
        }
      }

      if (size > largestComponent) largestComponent = size
    }
  }

  return { totalRoadCells, largestComponent }
}

export function calculateScores(grid) {
  // Use the unified scoring calculation as a base
  const unified = unifiedCalculateScores(grid)

  // Walkability & traffic & sustainability come from unified metrics where available
  const walkability = unified?.metrics?.walkability?.value ?? 0
  const traffic = unified?.metrics?.traffic?.value ?? 0
  const sustainability = unified?.metrics?.sustainability?.value ?? 0

  const { width, height } = getDimensions(grid)
  const totalCells = width * height
  const counts = {
    residential: 0,
    commercial: 0,
    hospital: 0,
    industrial: 0,
    park: 0,
    road: 0,
    water: 0,
    school: 0,
    empty: 0,
    locked: 0,
  }

  const residentialCells = []
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = grid[y][x]
      const type = getCellType(cell) || 'empty'
      if (counts[type] !== undefined) counts[type] += 1
      if (cell?.isLocked) counts.locked += 1
      if (type === 'residential') residentialCells.push(cell)
    }
  }

  const roadTargets = new Set(['road'])
  const parkTargets = new Set(['park'])
  const waterTargets = new Set(['water'])

  const roadAccessible = residentialCells.filter((cell) => nearestDistance(grid, cell, roadTargets) <= 2).length
  const parkAccessible = residentialCells.filter((cell) => nearestDistance(grid, cell, parkTargets) <= 3).length
  const waterDistances = residentialCells
    .map((cell) => nearestDistance(grid, cell, waterTargets))
    .filter((distance) => Number.isFinite(distance))

  const roadAccessibility = residentialCells.length > 0 ? (roadAccessible / residentialCells.length) * 100 : 100
  const parkAccess = residentialCells.length > 0 ? (parkAccessible / residentialCells.length) * 100 : 100
  const waterProximity = waterDistances.length > 0
    ? waterDistances.reduce((sum, value) => sum + value, 0) / waterDistances.length
    : 0

  const builtCells = counts.residential + counts.commercial + counts.hospital + counts.industrial + counts.school + counts.park + counts.road
  const nonWaterCells = Math.max(1, totalCells - counts.water)
  const densityEfficiency = (builtCells / nonWaterCells) * 100

  const zoneValues = [counts.residential, counts.commercial, counts.hospital, counts.industrial, counts.park, counts.road, counts.school].filter((value) => value > 0)
  const zoneTotal = zoneValues.reduce((sum, value) => sum + value, 0) || 1
  const entropy = zoneValues.reduce((sum, value) => {
    const p = value / zoneTotal
    return sum - (p * Math.log2(p))
  }, 0)
  const maxEntropy = Math.log2(zoneValues.length || 1)
  const zoningBalance = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 100

  const roadConnectivityData = countRoadComponents(grid)
  const connectivityScore = roadConnectivityData.totalRoadCells > 0
    ? (roadConnectivityData.largestComponent / roadConnectivityData.totalRoadCells) * 100
    : 100

  // For healthcare we use analyzeLayout to compute hospital distance and counts
  const metrics = analyzeLayout(grid)
  let healthcare = 0
  let avgHealthcareDistance = 0
  if (metrics.counts && metrics.counts.residential > 0) {
    if ((metrics.counts.hospital || 0) === 0) {
      healthcare = 0
    } else {
      avgHealthcareDistance = metrics.hospitalDistance || 0
      healthcare = Math.max(0, 100 - ((avgHealthcareDistance - 3) * (100 / 17)))
      healthcare = clamp(healthcare, 0, 100)
    }
  } else {
    healthcare = 100
  }

  const hasOsmConstraints = counts.locked > 0
  const overallScore = hasOsmConstraints
    ? Math.round(
        0.15 * roadAccessibility +
        0.15 * parkAccess +
        0.20 * walkability +
        0.15 * healthcare +
        0.15 * traffic +
        0.10 * sustainability +
        0.05 * clamp(zoningBalance, 0, 100) +
        0.05 * clamp(connectivityScore, 0, 100)
      )
    : Math.round(
        0.30 * walkability +
        0.25 * healthcare +
        0.25 * traffic +
        0.20 * sustainability
      )

  return {
    overall: clamp(overallScore, 0, 100),
    walkability: Math.round(walkability),
    healthcare: Math.round(healthcare),
    traffic: Math.round(traffic),
    sustainability: Math.round(sustainability),
    roadAccessibility: Math.round(clamp(roadAccessibility, 0, 100)),
    parkAccess: Math.round(clamp(parkAccess, 0, 100)),
    waterProximity: Number(waterProximity.toFixed(2)),
    densityEfficiency: Math.round(clamp(densityEfficiency, 0, 100)),
    zoningBalance: Math.round(clamp(zoningBalance, 0, 100)),
    connectivityScore: Math.round(clamp(connectivityScore, 0, 100)),
    distances: {
      walkability: unified?.metrics?.walkability?.averageDistance ?? 0,
      healthcare: Math.round(avgHealthcareDistance * 10) / 10,
      waterProximity: Number(waterProximity.toFixed(2)),
    },
    labels: {
      walkability: getScoreCategory('walkability', walkability),
      traffic: getScoreCategory('traffic', traffic),
      healthcare: getScoreCategory('healthcare', healthcare),
      sustainability: getScoreCategory('sustainability', sustainability),
    },
    metrics: {
      residentialCount: metrics.counts.residential || 0,
      hospitalCount: metrics.counts.hospital || 0,
      shopParkCount: (metrics.counts.commercial || 0) + (metrics.counts.park || 0),
      parkCount: metrics.counts.park || 0,
      greenRatio: metrics.greenCoverage ? metrics.greenCoverage / 100 : 0,
      roadRatio: metrics.roadCoverage ? metrics.roadCoverage / 100 : 0,
      counts,
      lockedCells: counts.locked,
      roadAccessibility: Math.round(clamp(roadAccessibility, 0, 100)),
      parkAccess: Math.round(clamp(parkAccess, 0, 100)),
      waterProximity: Number(waterProximity.toFixed(2)),
      densityEfficiency: Math.round(clamp(densityEfficiency, 0, 100)),
      zoningBalance: Math.round(clamp(zoningBalance, 0, 100)),
      connectivityScore: Math.round(clamp(connectivityScore, 0, 100)),
    }
  }
}
