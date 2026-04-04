// ─── Guide Section 6 — Urban Score Formulas ───────────────────────────────
//
// Sustainability:  (park_cells / total_cells) × 100 × 3.5  → clamped 0–100
// Traffic Score:    100 − (road_cells / total_cells) × 200  → fewer roads = better
// Walkability:     max(0, 100 − avg_dist × 5)               → linear decay
// Density:         (residential_cells / non_road_cells) × 100
// Liveability:     composite (kept for UI continuity)

const getTotalCells = (grid) => {
  if (!Array.isArray(grid) || grid.length === 0) return 0;

  return grid.reduce((total, row) => {
    if (!Array.isArray(row)) return total;
    return total + row.length;
  }, 0);
};

const countCellsByType = (grid, type) => {
  if (!Array.isArray(grid) || grid.length === 0) return 0;

  return grid.reduce((total, row) => {
    if (!Array.isArray(row)) return total;

    return (
      total +
      row.reduce((rowTotal, cell) => {
        if (!cell || typeof cell !== 'object') return rowTotal;
        return rowTotal + (cell.type === type ? 1 : 0);
      }, 0)
    );
  }, 0);
};

const countCells = (grid) => {
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
      const cellType = cell?.type;
      if (typeof cellType === 'string' && counts[cellType] !== undefined) {
        counts[cellType] += 1;
      }
    });
  });

  return counts;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getNearestParkDistance = (grid, sourceCell) => {
  let nearestDistance = Number.POSITIVE_INFINITY;

  grid.forEach((row) => {
    if (!Array.isArray(row)) return;

    row.forEach((cell) => {
      if (!cell || typeof cell !== 'object') return;
      if (cell.type !== 'park') return;

      const distance = Math.abs(sourceCell.x - cell.x) + Math.abs(sourceCell.y - cell.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
      }
    });
  });

  return nearestDistance;
};

const getNearestAmenityDistance = (grid, sourceCell) => {
  let nearestDistance = Number.POSITIVE_INFINITY;

  grid.forEach((row) => {
    if (!Array.isArray(row)) return;

    row.forEach((cell) => {
      if (!cell || typeof cell !== 'object') return;
      if (cell.type !== 'park' && cell.type !== 'hospital') return;

      const distance = Math.abs(sourceCell.x - cell.x) + Math.abs(sourceCell.y - cell.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
      }
    });
  });

  return nearestDistance;
};

export const calcSustainability = (grid) => {
  const totalCells = getTotalCells(grid);
  if (totalCells === 0) return '0.00';

  const parkCount = countCellsByType(grid, 'park');
  return (parkCount / totalCells).toFixed(2);
};

export const calcTraffic = (grid) => {
  const totalCells = getTotalCells(grid);
  if (totalCells === 0) return '0.00';

  const roadCount = countCellsByType(grid, 'road');
  return (roadCount / totalCells).toFixed(2);
};

export const calcWalkability = (grid) => {
  if (!Array.isArray(grid) || grid.length === 0) return 'Low';

  let residentialCount = 0;
  let distanceSum = 0;

  grid.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell) => {
      if (cell?.type !== 'residential') return;
      residentialCount += 1;
      const d = getNearestParkDistance(grid, cell);
      if (Number.isFinite(d)) distanceSum += d;
    });
  });

  if (residentialCount === 0) return 'Low';
  const avgDist = distanceSum / residentialCount;
  const walkScore = Math.max(0, 100 - avgDist * 5);
  return walkScore >= 50 ? 'High' : 'Low';
};

export const calculateScores = (grid) => {
  const totalCells = getTotalCells(grid);
  const counts = countCells(grid);

  if (totalCells === 0) {
    return {
      totalCells,
      counts,
      metrics: {
        sustainability: {
          value: 0,
          display: '0.0%',
          formula: '(park cells / total cells) × 100 × 3.5',
        },
        traffic: {
          value: 0,
          display: '0 / 100',
          formula: '100 − (road cells / total cells) × 200',
        },
        walkability: {
          value: 0,
          display: '0 / 100',
          formula: 'max(0, 100 − avg residential→park distance × 5)',
          averageDistance: 0,
        },
        density: {
          value: 0,
          display: '0.0%',
          formula: 'residential cells / non-road cells',
        },
        liveability: {
          value: 0,
          display: '0 / 100',
          formula:
            '0.30×sustainability + 0.35×walkability + 0.20×(100−traffic) + 0.15×density-balance',
        },
      },
    };
  }

  // Guide Section 6 — Sustainability: scale up for visibility
  const sustainabilityRaw = (counts.park / totalCells) * 100 * 3.5;
  const sustainability = clamp(sustainabilityRaw, 0, 100);

  // Guide Section 6 — Traffic Score: fewer roads = better
  const trafficRaw = 100 - (counts.road / totalCells) * 200;
  const traffic = clamp(trafficRaw, 0, 100);

  // Guide Section 6 — Density: residential / non-road cells
  const nonRoadCells = totalCells - counts.road;
  const densityRaw = nonRoadCells > 0 ? (counts.residential / nonRoadCells) * 100 : 0;
  const density = clamp(densityRaw, 0, 100);

  // Guide Section 6 — Walkability: avg distance residential to nearest park
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
      });
    });
  }

  const averageDistance = residentialCount > 0 ? distanceSum / residentialCount : 0;
  // Guide Section 6 — Walkability: linear decay
  const walkability = residentialCount > 0 ? Math.max(0, 100 - averageDistance * 5) : 0;

  // Liveability: composite (kept for UI continuity)
  const densityBalance = clamp(100 - Math.abs(density - 35) * 3, 0, 100);
  const liveability =
    sustainability * 0.3 + walkability * 0.35 + traffic * 0.2 + densityBalance * 0.15;

  return {
    totalCells,
    counts,
    metrics: {
      sustainability: {
        value: Math.round(clamp(sustainability, 0, 100)),
        display: `${sustainability.toFixed(1)}%`,
        formula: '(park cells / total cells) × 100 × 3.5',
      },
      traffic: {
        value: Math.round(clamp(traffic, 0, 100)),
        display: `${Math.round(clamp(traffic, 0, 100))} / 100`,
        formula: '100 − (road cells / total cells) × 200',
      },
      walkability: {
        value: Math.round(clamp(walkability, 0, 100)),
        display: `${Math.round(clamp(walkability, 0, 100))} / 100`,
        formula: 'max(0, 100 − avg residential→park distance × 5)',
        averageDistance: Number(averageDistance.toFixed(2)),
      },
      density: {
        value: Math.round(clamp(density, 0, 100)),
        display: `${density.toFixed(1)}%`,
        formula: 'residential cells / non-road cells',
      },
      liveability: {
        value: Math.round(clamp(liveability, 0, 100)),
        display: `${Math.round(clamp(liveability, 0, 100))} / 100`,
        formula:
          '0.30×sustainability + 0.35×walkability + 0.20×traffic + 0.15×density-balance',
      },
    },
  };
};
