// ═══════════════════════════════════════════════════════════════════════════
// analyzer.js — Core Metrics Engine for CitySketch Explainable Planning AI
// ═══════════════════════════════════════════════════════════════════════════
//
// Computes raw spatial metrics from a 2D grid layout:
//   • Average Manhattan distance from residential → hospitals, parks, commercial
//   • Green coverage percentage
//   • Road connectivity score (ratio + adjacency checks)
//   • Zone distribution counts
//
// All functions operate on a grid: GridCell[][] where each cell has { x, y, type }

/**
 * Manhattan distance between two grid coordinates.
 */
function manhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Collect all cells of a given type from the grid.
 * Returns array of { x, y, type } objects.
 */
function collectCellsByType(grid, type) {
  const cells = [];
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    if (!Array.isArray(row)) continue;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (cell && cell.type === type) {
        cells.push({ x, y, type });
      }
    }
  }
  return cells;
}

/**
 * Compute average minimum distance from every residential cell
 * to the nearest cell of a target type.
 *
 * Returns Infinity if no target cells exist, 0 if no residential cells exist.
 */
function avgDistanceToType(grid, residentialCells, targetType) {
  const targets = collectCellsByType(grid, targetType);
  if (targets.length === 0) return Infinity;
  if (residentialCells.length === 0) return 0;

  let totalMinDist = 0;
  for (const res of residentialCells) {
    let minDist = Infinity;
    for (const target of targets) {
      const d = manhattanDistance(res.x, res.y, target.x, target.y);
      if (d < minDist) minDist = d;
    }
    totalMinDist += minDist;
  }
  return totalMinDist / residentialCells.length;
}

/**
 * Find the geographic center of a set of cells (centroid).
 */
function findCentroid(cells) {
  if (cells.length === 0) return { x: 0, y: 0 };
  const sumX = cells.reduce((s, c) => s + c.x, 0);
  const sumY = cells.reduce((s, c) => s + c.y, 0);
  return { x: Math.round(sumX / cells.length), y: Math.round(sumY / cells.length) };
}

/**
 * Identify the largest cluster of residential cells using flood-fill.
 * Returns { cells: [...], centroid: {x, y}, size: number }
 */
function findLargestResidentialCluster(grid, residentialCells) {
  if (residentialCells.length === 0) return { cells: [], centroid: { x: 0, y: 0 }, size: 0 };

  const visited = new Set();
  const key = (x, y) => `${x},${y}`;
  const resSet = new Set(residentialCells.map(c => key(c.x, c.y)));

  let largestCluster = [];

  for (const startCell of residentialCells) {
    const k = key(startCell.x, startCell.y);
    if (visited.has(k)) continue;

    // BFS flood-fill
    const cluster = [];
    const queue = [startCell];
    visited.add(k);

    while (queue.length > 0) {
      const cell = queue.shift();
      cluster.push(cell);

      // Check 4-directional neighbors
      const neighbors = [
        { x: cell.x - 1, y: cell.y },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x, y: cell.y + 1 },
      ];

      for (const n of neighbors) {
        const nk = key(n.x, n.y);
        if (!visited.has(nk) && resSet.has(nk)) {
          visited.add(nk);
          queue.push(n);
        }
      }
    }

    if (cluster.length > largestCluster.length) {
      largestCluster = cluster;
    }
  }

  return {
    cells: largestCluster,
    centroid: findCentroid(largestCluster),
    size: largestCluster.length,
  };
}

/**
 * Check how many road cells are connected to at least one other road cell
 * (4-directional adjacency). High ratio = good road network connectivity.
 */
function roadConnectivityScore(grid) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const roadCells = collectCellsByType(grid, 'road');
  if (roadCells.length === 0) return 0;

  const roadSet = new Set(roadCells.map(c => `${c.x},${c.y}`));
  let connectedCount = 0;

  for (const cell of roadCells) {
    const neighbors = [
      `${cell.x - 1},${cell.y}`,
      `${cell.x + 1},${cell.y}`,
      `${cell.x},${cell.y - 1}`,
      `${cell.x},${cell.y + 1}`,
    ];
    if (neighbors.some(n => roadSet.has(n))) {
      connectedCount++;
    }
  }

  // Percentage of road cells that are connected to another road
  return Math.round((connectedCount / roadCells.length) * 100);
}

/**
 * Main analysis function.
 *
 * Accepts a 2D grid and returns comprehensive spatial metrics.
 */
export function analyzeLayout(grid) {
  if (!Array.isArray(grid) || grid.length === 0) {
    return {
      hospitalDistance: Infinity,
      parkDistance: Infinity,
      commercialDistance: Infinity,
      schoolDistance: Infinity,
      greenCoverage: 0,
      roadCoverage: 0,
      roadConnectivity: 0,
      totalCells: 0,
      counts: {},
      largestResidentialCluster: { cells: [], centroid: { x: 0, y: 0 }, size: 0 },
    };
  }

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const totalCells = rows * cols;

  // Collect cells by type
  const residential = collectCellsByType(grid, 'residential');
  const parks = collectCellsByType(grid, 'park');
  const hospitals = collectCellsByType(grid, 'hospital');
  const commercial = collectCellsByType(grid, 'commercial');
  const roads = collectCellsByType(grid, 'road');
  const schools = collectCellsByType(grid, 'school');
  const water = collectCellsByType(grid, 'water');
  const industrial = collectCellsByType(grid, 'industrial');

  // Compute average distances from residential to key services
  const hospitalDistance = avgDistanceToType(grid, residential, 'hospital');
  const parkDistance = avgDistanceToType(grid, residential, 'park');
  const commercialDistance = avgDistanceToType(grid, residential, 'commercial');
  const schoolDistance = avgDistanceToType(grid, residential, 'school');

  // Green coverage = park cells / total cells
  const greenCoverage = totalCells > 0 ? (parks.length / totalCells) * 100 : 0;

  // Road coverage = road cells / total cells
  const roadCoverage = totalCells > 0 ? (roads.length / totalCells) * 100 : 0;

  // Road connectivity (how well-connected is the road network)
  const connectivity = roadConnectivityScore(grid);

  // Largest residential cluster
  const largestCluster = findLargestResidentialCluster(grid, residential);

  /**
   * Get top N features of a type, ordered by proximity to residential
   * Returns array of { x, y, distToResidential } for location-aware explanations
   */
  function getTopFeatures(featureCells, maxCount = 3) {
    if (featureCells.length === 0) return [];
    
    const withDist = featureCells.map(feat => {
      let minDist = Infinity;
      for (const res of residential) {
        const d = manhattanDistance(res.x, res.y, feat.x, feat.y);
        if (d < minDist) minDist = d;
      }
      return { ...feat, distToResidential: minDist };
    });
    
    return withDist
      .sort((a, b) => a.distToResidential - b.distToResidential)
      .slice(0, maxCount)
      .map(f => ({ x: f.x, y: f.y }));
  }

  return {
    // Core distance metrics
    hospitalDistance: Number.isFinite(hospitalDistance) ? Number(hospitalDistance.toFixed(2)) : Infinity,
    parkDistance: Number.isFinite(parkDistance) ? Number(parkDistance.toFixed(2)) : Infinity,
    commercialDistance: Number.isFinite(commercialDistance) ? Number(commercialDistance.toFixed(2)) : Infinity,
    schoolDistance: Number.isFinite(schoolDistance) ? Number(schoolDistance.toFixed(2)) : Infinity,

    // Coverage percentages
    greenCoverage: Number(greenCoverage.toFixed(1)),
    roadCoverage: Number(roadCoverage.toFixed(1)),
    roadConnectivity: connectivity,

    // Grid metadata
    totalCells,
    gridSize: { rows, cols },

    // Zone distribution counts
    counts: {
      residential: residential.length,
      commercial: commercial.length,
      hospital: hospitals.length,
      park: parks.length,
      road: roads.length,
      school: schools.length,
      water: water.length,
      industrial: industrial.length,
    },

    // Cluster analysis (used by suggester for placement recommendations)
    largestResidentialCluster: largestCluster,

    // Feature placements for dynamic explanations
    placements: {
      parks: getTopFeatures(parks, 4),
      hospitals: getTopFeatures(hospitals, 3),
      schools: getTopFeatures(schools, 3),
      commercial: getTopFeatures(commercial, 3),
    },
  };
}
