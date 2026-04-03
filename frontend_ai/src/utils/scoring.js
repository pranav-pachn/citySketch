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

const hasAdjacentPark = (grid, rowIndex, colIndex) => {
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  return directions.some(([rowOffset, colOffset]) => {
    const nextRow = rowIndex + rowOffset;
    const nextCol = colIndex + colOffset;
    const neighbor = grid?.[nextRow]?.[nextCol];

    return neighbor?.type === 'park';
  });
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
  let residentialNearParkCount = 0;

  // Measure how many homes can reach a park in one block.
  grid.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) return;

    row.forEach((cell, colIndex) => {
      if (cell?.type !== 'residential') return;

      residentialCount += 1;
      if (hasAdjacentPark(grid, rowIndex, colIndex)) {
        residentialNearParkCount += 1;
      }
    });
  });

  if (residentialCount === 0) return 'Low';

  const parkAccessRatio = residentialNearParkCount / residentialCount;
  return parkAccessRatio >= 0.4 ? 'High' : 'Low';
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
          formula: 'park cells / total cells',
        },
        traffic: {
          value: 0,
          display: '0.0%',
          formula: 'road cells / total cells',
        },
        walkability: {
          value: 0,
          display: '0 / 100',
          formula: '100 / (1 + average residential distance to park/hospital)',
          averageDistance: 0,
        },
        density: {
          value: 0,
          display: '0.0%',
          formula: 'residential cells / total cells',
        },
        liveability: {
          value: 0,
          display: '0 / 100',
          formula:
            '0.30*sustainability + 0.35*walkability + 0.20*(100-traffic) + 0.15*density-balance',
        },
      },
    };
  }

  const sustainability = (counts.park / totalCells) * 100;
  const traffic = (counts.road / totalCells) * 100;
  const density = (counts.residential / totalCells) * 100;

  let residentialCount = 0;
  let distanceSum = 0;

  if (Array.isArray(grid) && grid.length > 0) {
    grid.forEach((row) => {
      if (!Array.isArray(row)) return;

      row.forEach((cell) => {
        if (!cell || cell.type !== 'residential') return;

        const nearestDistance = getNearestAmenityDistance(grid, cell);
        if (Number.isFinite(nearestDistance)) {
          residentialCount += 1;
          distanceSum += nearestDistance;
        }
      });
    });
  }

  const averageDistance = residentialCount > 0 ? distanceSum / residentialCount : 0;
  const walkability = residentialCount > 0 ? 100 / (1 + averageDistance) : 0;

  const densityBalance = clamp(100 - Math.abs(density - 35) * 3, 0, 100);
  const liveability =
    sustainability * 0.3 + walkability * 0.35 + (100 - traffic) * 0.2 + densityBalance * 0.15;

  return {
    totalCells,
    counts,
    metrics: {
      sustainability: {
        value: Math.round(clamp(sustainability, 0, 100)),
        display: `${sustainability.toFixed(1)}%`,
        formula: 'park cells / total cells',
      },
      traffic: {
        value: Math.round(clamp(traffic, 0, 100)),
        display: `${traffic.toFixed(1)}%`,
        formula: 'road cells / total cells',
      },
      walkability: {
        value: Math.round(clamp(walkability, 0, 100)),
        display: `${Math.round(clamp(walkability, 0, 100))} / 100`,
        formula: '100 / (1 + average residential distance to park/hospital)',
        averageDistance: Number(averageDistance.toFixed(2)),
      },
      density: {
        value: Math.round(clamp(density, 0, 100)),
        display: `${density.toFixed(1)}%`,
        formula: 'residential cells / total cells',
      },
      liveability: {
        value: Math.round(clamp(liveability, 0, 100)),
        display: `${Math.round(clamp(liveability, 0, 100))} / 100`,
        formula:
          '0.30*sustainability + 0.35*walkability + 0.20*(100-traffic) + 0.15*density-balance',
      },
    },
  };
};
