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

export const calculateScores = (grid) => ({
  sustainability: calcSustainability(grid),
  traffic: calcTraffic(grid),
  walkability: calcWalkability(grid),
});
