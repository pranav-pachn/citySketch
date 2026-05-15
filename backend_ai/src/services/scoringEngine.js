export function calculateDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance
}

/**
 * Convert numeric score (0-100) to descriptive label
 */
export function getScoreLabel(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Very Poor';
}

/**
 * Convert numeric score to detailed category with description
 */
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

export function calculateScores(grid) {
  let walkabilityScore = 0;
  let healthcareScore = 0;
  let trafficScore = 0;
  let sustainabilityScore = 0;
  let avgWalkabilityDistance = 0;
  let avgHealthcareDistance = 0;

  if (!grid || grid.length === 0 || !grid[0] || grid[0].length === 0) {
    return {
      overall: 0, walkability: 0, healthcare: 0, traffic: 0, sustainability: 0,
      distances: { walkability: 0, healthcare: 0 },
      labels: {
        walkability: { label: 'N/A', description: '' },
        traffic: { label: 'N/A', description: '' },
        healthcare: { label: 'N/A', description: '' },
        sustainability: { label: 'N/A', description: '' },
      },
      metrics: { residentialCount: 0, hospitalCount: 0, shopParkCount: 0, greenRatio: 0, roadRatio: 0 }
    };
  }

  const rows = grid.length;
  const cols = grid[0].length;
  const totalCells = rows * cols;

  let residentialCells = [];
  let shopParksCells = [];
  let parkCells = [];
  let hospitalCells = [];
  let roadCells = [];
  let greenCells = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];
      const type = typeof cell === 'object' ? cell.type : cell;
      
      if (type === 'residential') residentialCells.push({ x, y });
      if (type === 'commercial' || type === 'park') shopParksCells.push({ x, y });
      if (type === 'park') {
        parkCells.push({ x, y });
        greenCells++;
      }
      if (type === 'hospital') hospitalCells.push({ x, y });
      if (type === 'road') roadCells.push({ x, y });
    }
  }

  // 1. Walkability Score (distance: residential <-> shops/parks)
  // Now returns average distance to parks specifically (more realistic)
  if (residentialCells.length > 0 && parkCells.length > 0) {
    let totalMinDist = 0;
    residentialCells.forEach(res => {
      let minDist = Infinity;
      parkCells.forEach(park => {
        const d = calculateDistance(res.x, res.y, park.x, park.y);
        if (d < minDist) minDist = d;
      });
      totalMinDist += minDist;
    });
    avgWalkabilityDistance = totalMinDist / residentialCells.length;
    // Ideal avgDist <= 2 blocks. Drops to 0 at avgDist >= 15.
    walkabilityScore = Math.max(0, 100 - ((avgWalkabilityDistance - 2) * (100 / 13)));
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
    avgHealthcareDistance = totalMinDist / residentialCells.length;
    // Hospitals can be slightly further. Ideal <= 3 blocks. Drops to 0 at avgDist >= 20.
    healthcareScore = Math.max(0, 100 - ((avgHealthcareDistance - 3) * (100 / 17)));
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

  // Calculate overall score
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
    
    // New: Distance metrics for more realistic walkability data
    distances: {
      walkability: Math.round(avgWalkabilityDistance * 10) / 10,
      healthcare: Math.round(avgHealthcareDistance * 10) / 10,
    },

    // New: Descriptive labels for each score
    labels: {
      walkability: getScoreCategory('walkability', walkabilityScore),
      traffic: getScoreCategory('traffic', trafficScore),
      healthcare: getScoreCategory('healthcare', healthcareScore),
      sustainability: getScoreCategory('sustainability', sustainabilityScore),
    },

    metrics: {
      residentialCount: residentialCells.length,
      hospitalCount: hospitalCells.length,
      shopParkCount: shopParksCells.length,
      parkCount: parkCells.length,
      greenRatio: greenRatio,
      roadRatio: roadRatio
    }
  };
}
