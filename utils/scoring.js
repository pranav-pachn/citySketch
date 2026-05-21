/**
 * Unified scoring utilities shared between frontend and backend.
 * Exports: calculateScores(grid), calculateCellHighlights(grid), getScoreLabel(score), getScoreCategory(metricName, score)
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function getTotalCells(grid) {
  if (!Array.isArray(grid) || grid.length === 0) return 0;
  return grid.reduce((total, row) => (Array.isArray(row) ? total + row.length : total), 0);
}

function countCells(grid) {
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
  };
  if (!Array.isArray(grid) || grid.length === 0) return counts;
  grid.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell) => {
      const t = cell?.type
      if (typeof t === 'string' && counts[t] !== undefined) counts[t]++
    })
  })
  return counts
}

function getNearestParkDistance(grid, sourceCell) {
  let nearestDistance = Number.POSITIVE_INFINITY;
  grid.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell) => {
      if (!cell || typeof cell !== 'object') return;
      if (cell.type !== 'park') return;
      const distance = Math.abs(sourceCell.x - cell.x) + Math.abs(sourceCell.y - cell.y);
      if (distance < nearestDistance) nearestDistance = distance;
    })
  })
  return nearestDistance
}

function getNearestAmenityDistance(grid, sourceCell) {
  let nearestDistance = Number.POSITIVE_INFINITY;
  grid.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell) => {
      if (!cell || typeof cell !== 'object') return;
      if (cell.type !== 'park' && cell.type !== 'hospital') return;
      const distance = Math.abs(sourceCell.x - cell.x) + Math.abs(sourceCell.y - cell.y);
      if (distance < nearestDistance) nearestDistance = distance;
    })
  })
  return nearestDistance
}

export function calculateCellHighlights(grid) {
  const highlights = {};
  if (!Array.isArray(grid) || grid.length === 0) return highlights;
  grid.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell) => {
      if (!cell || cell.type !== 'residential') return;
      const parkDist = getNearestParkDistance(grid, cell);
      const amenityDist = getNearestAmenityDistance(grid, cell);
      if (parkDist > 4 || amenityDist > 5) {
        let reason = 'Critical: ';
        if (parkDist > 4 && amenityDist > 5) reason += 'No nearby nature or amenities.';
        else if (parkDist > 4) reason += 'Too far from green spaces (>4 blocks).';
        else reason += 'Poor access to healthcare/shops (>5 blocks).';
        highlights[`${cell.x},${cell.y}`] = { color: 'rgba(239, 68, 68, 0.4)', type: 'bad', reason };
      } else if (parkDist <= 2 && amenityDist <= 3) {
        highlights[`${cell.x},${cell.y}`] = { color: 'rgba(34, 197, 94, 0.4)', type: 'good', reason: 'Optimal zone: High walkability to nature & amenities.' };
      }
    })
  })
  return highlights
}

export function calculateScores(grid) {
  const totalCells = getTotalCells(grid);
  const counts = countCells(grid);
  if (totalCells === 0) {
    return {
      totalCells,
      counts,
      metrics: {
        sustainability: { value: 0, display: '0.0%', formula: '(park cells / total cells) × 100 × 3.5' },
        traffic: { value: 0, display: '0 / 100', formula: '100 − (road cells / total cells) × 200' },
        walkability: { value: 0, display: '0 / 100', formula: 'max(0, 100 − avg residential→park distance × 5)', averageDistance: 0 },
        density: { value: 0, display: '0.0%', formula: 'residential cells / non-road cells' },
        liveability: { value: 0, display: '0 / 100', formula: '0.30×sustainability + 0.35×walkability + 0.20×(100−traffic) + 0.15×density-balance' }
      }
    }
  }

  const sustainabilityRaw = (counts.park / totalCells) * 100 * 3.5;
  const sustainability = clamp(sustainabilityRaw, 0, 100);
  const trafficRaw = 100 - (counts.road / totalCells) * 200;
  const traffic = clamp(trafficRaw, 0, 100);
  const nonRoadCells = totalCells - counts.road;
  const densityRaw = nonRoadCells > 0 ? (counts.residential / nonRoadCells) * 100 : 0;
  const density = clamp(densityRaw, 0, 100);

  let residentialCount = 0;
  let distanceSum = 0;
  if (Array.isArray(grid) && grid.length > 0) {
    grid.forEach((row) => {
      if (!Array.isArray(row)) return;
      row.forEach((cell) => {
        if (!cell || cell.type !== 'residential') return;
        const nearestDistance = getNearestParkDistance(grid, cell);
        if (Number.isFinite(nearestDistance)) {
          residentialCount += 1;
          distanceSum += nearestDistance;
        }
      })
    })
  }
  const averageDistance = residentialCount > 0 ? distanceSum / residentialCount : 0;
  const walkability = residentialCount > 0 ? Math.max(0, 100 - averageDistance * 5) : 0;
  const densityBalance = clamp(100 - Math.abs(density - 35) * 3, 0, 100);
  const liveability = sustainability * 0.3 + walkability * 0.35 + traffic * 0.2 + densityBalance * 0.15;

  return {
    totalCells,
    counts,
    metrics: {
      sustainability: { value: Math.round(clamp(sustainability, 0, 100)), display: `${sustainability.toFixed(1)}%`, formula: '(park cells / total cells) × 100 × 3.5' },
      traffic: { value: Math.round(clamp(traffic, 0, 100)), display: `${Math.round(clamp(traffic, 0, 100))} / 100`, formula: '100 − (road cells / total cells) × 200' },
      walkability: { value: Math.round(clamp(walkability, 0, 100)), display: `${Math.round(clamp(walkability, 0, 100))} / 100`, formula: 'max(0, 100 − avg residential→park distance × 5)', averageDistance: Number(averageDistance.toFixed(2)) },
      density: { value: Math.round(clamp(density, 0, 100)), display: `${density.toFixed(1)}%`, formula: 'residential cells / non-road cells' },
      liveability: { value: Math.round(clamp(liveability, 0, 100)), display: `${Math.round(clamp(liveability, 0, 100))} / 100`, formula: '0.30×sustainability + 0.35×walkability + 0.20×traffic + 0.15×density-balance' }
    }
  }
}

export function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Very Poor';
}

export function getScoreCategory(metricName, score) {
  const categories = {
    walkability: {
      85: { label: 'Excellent', description: 'Most homes within short walking distance to amenities' },
      70: { label: 'Good', description: 'Good pedestrian connectivity across neighborhoods' },
      50: { label: 'Fair', description: 'Some areas walkable, others less accessible' },
      30: { label: 'Poor', description: 'Long distances to shops and parks; car-dependent' },
      0: { label: 'Very Poor', description: 'Residents isolated from amenities' },
    },
    traffic: {
      85: { label: 'Low Congestion', description: 'Efficient road network, minimal traffic flow issues' },
      70: { label: 'Balanced', description: 'Adequate road coverage with reasonable connectivity' },
      50: { label: 'Moderate Congestion', description: 'Some bottlenecks; traffic management needed' },
      30: { label: 'Heavy Congestion', description: 'Insufficient roads for expected traffic volume' },
      0: { label: 'Critical Congestion', description: 'Grid disconnected; vehicles stranded' },
    },
    healthcare: {
      85: { label: 'Excellent', description: 'Hospitals within immediate reach of all residents' },
      70: { label: 'Good', description: 'Healthcare facilities accessible to most' },
      50: { label: 'Adequate', description: 'Healthcare present but some areas underserved' },
      30: { label: 'Limited', description: 'Few facilities; residents face long waits' },
      0: { label: 'None', description: 'No healthcare access; emergency response impossible' },
    },
    sustainability: {
      85: { label: 'Excellent', description: 'Rich green space; strong air quality and biodiversity' },
      70: { label: 'Good', description: 'Sufficient parks for recreation and environmental health' },
      50: { label: 'Fair', description: 'Minimal green coverage; room for parks' },
      30: { label: 'Poor', description: 'Very few parks; lacking environmental balance' },
      0: { label: 'Critical', description: 'Concrete jungle; no green space or biodiversity' },
    },
  };

  const thresholds = categories[metricName] || {};
  for (const threshold of [85, 70, 50, 30, 0]) {
    if (score >= threshold) {
      return thresholds[threshold] || { label: 'Unknown', description: '' };
    }
  }
  return { label: 'Unknown', description: '' };
}

export default { calculateScores, calculateCellHighlights, getScoreLabel, getScoreCategory }
