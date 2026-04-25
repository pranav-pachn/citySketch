export function calculateDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance
}

export function calculateScores(grid) {
  let walkabilityScore = 0;
  let healthcareScore = 0;
  let trafficScore = 0;
  let sustainabilityScore = 0;

  if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) {
    return {
      overall: 0, walkability: 0, healthcare: 0, traffic: 0, sustainability: 0,
      metrics: { residentialCount: 0, hospitalCount: 0, shopParkCount: 0, greenRatio: 0, roadRatio: 0 }
    };
  }

  const rows = grid.length;
  const cols = grid[0].length;
  const totalCells = rows * cols;

  let residentialCells = [];
  let shopParksCells = [];
  let hospitalCells = [];
  let roadCells = [];
  let greenCells = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const type = typeof cell === 'object' ? cell.type : cell;
      
      if (type === 'residential') residentialCells.push({ x, y });
      if (type === 'commercial' || type === 'park') shopParksCells.push({ x, y });
      if (type === 'hospital') hospitalCells.push({ x, y });
      if (type === 'road') roadCells.push({ x, y });
      if (type === 'park') greenCells++;
    }
  }

  // 1. Walkability Score (distance: residential <-> shops/parks)
  if (residentialCells.length > 0 && shopParksCells.length > 0) {
    let totalMinDist = 0;
    residentialCells.forEach(res => {
      let minDist = Infinity;
      shopParksCells.forEach(sp => {
        const d = calculateDistance(res.x, res.y, sp.x, sp.y);
        if (d < minDist) minDist = d;
      });
      totalMinDist += minDist;
    });
    const avgDist = totalMinDist / residentialCells.length;
    // Ideal avgDist <= 2. Drops to 0 at avgDist >= 15.
    walkabilityScore = Math.max(0, 100 - ((avgDist - 2) * (100 / 13)));
    walkabilityScore = Math.min(100, walkabilityScore);
  } else if (residentialCells.length === 0) {
    walkabilityScore = 100; // N/A, give perfect
  } else {
    walkabilityScore = 0;
  }

  // 2. Healthcare Access (distance: residential <-> hospitals)
  if (residentialCells.length > 0 && hospitalCells.length > 0) {
    let totalMinDist = 0;
    residentialCells.forEach(res => {
      let minDist = Infinity;
      hospitalCells.forEach(hosp => {
        const d = calculateDistance(res.x, res.y, hosp.x, hosp.y);
        if (d < minDist) minDist = d;
      });
      totalMinDist += minDist;
    });
    const avgDist = totalMinDist / residentialCells.length;
    // Hospitals can be slightly further. Ideal <= 3. Drops to 0 at avgDist >= 20.
    healthcareScore = Math.max(0, 100 - ((avgDist - 3) * (100 / 17)));
    healthcareScore = Math.min(100, healthcareScore);
  } else if (residentialCells.length > 0 && hospitalCells.length === 0) {
    healthcareScore = 0;
  } else {
    healthcareScore = 100;
  }

  // 3. Traffic Efficiency (road connectivity)
  const roadRatio = roadCells.length / totalCells;
  // Ideal ratio might be between 10% and 25%.
  if (roadRatio >= 0.10 && roadRatio <= 0.25) {
    trafficScore = 100;
  } else if (roadRatio < 0.10) {
    trafficScore = (roadRatio / 0.10) * 100;
  } else {
    trafficScore = Math.max(0, 100 - ((roadRatio - 0.25) * 200));
  }

  // 4. Sustainability (green zones %)
  const greenRatio = greenCells / totalCells;
  // Ideal green ratio >= 15%
  sustainabilityScore = Math.min(100, (greenRatio / 0.15) * 100);

  // Example logic (simple but powerful):
  const overallScore = 
    0.3 * walkabilityScore +
    0.25 * healthcareScore +
    0.25 * trafficScore +
    0.2 * sustainabilityScore;

  return {
    overall: Math.round(overallScore),
    walkability: Math.round(walkabilityScore),
    healthcare: Math.round(healthcareScore),
    traffic: Math.round(trafficScore),
    sustainability: Math.round(sustainabilityScore),
    metrics: {
      residentialCount: residentialCells.length,
      hospitalCount: hospitalCells.length,
      shopParkCount: shopParksCells.length,
      greenRatio: greenRatio,
      roadRatio: roadRatio
    }
  };
}
