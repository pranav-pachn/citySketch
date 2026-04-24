// ═══════════════════════════════════════════════════════════════════════════
// suggester.js — Structured Suggestion Engine for CitySketch
// ═══════════════════════════════════════════════════════════════════════════
//
// Takes analyzed metrics (from analyzer.js) and score breakdown (from
// scoringEngine.js) and returns actionable, structured suggestions with
// predicted impact percentages.
//
// Each suggestion follows the schema:
//   { action: string, reason: string, impact: string }

/**
 * Generate structured planning suggestions with measurable impact estimates.
 *
 * @param {object} metrics - Output from analyzeLayout()
 * @param {object} scores  - Output from calculateScores()
 * @returns {Array<{action: string, reason: string, impact: string}>}
 */
export function generateSuggestions(metrics, scores) {
  const suggestions = [];

  // ─── Healthcare Access ─────────────────────────────────────────────────
  if (metrics.counts.hospital === 0 && metrics.counts.residential > 0) {
    // No hospitals at all — critical
    const centroid = metrics.largestResidentialCluster?.centroid;
    const locationHint = centroid
      ? `near grid position (${centroid.x}, ${centroid.y})`
      : 'near the central residential cluster';

    suggestions.push({
      action: `Add a hospital ${locationHint}`,
      reason: 'No healthcare facilities exist in the city. Residents have zero emergency access.',
      impact: '+25–40% healthcare score',
    });
  } else if (metrics.hospitalDistance > 8) {
    // Hospitals exist but are far from residential zones
    const centroid = metrics.largestResidentialCluster?.centroid;
    const locationHint = centroid
      ? `near (${centroid.x}, ${centroid.y})`
      : 'closer to residential clusters';

    const estimatedGain = Math.min(30, Math.round((metrics.hospitalDistance - 3) * 2.5));
    suggestions.push({
      action: `Place an additional hospital ${locationHint}`,
      reason: `Average hospital distance is ${metrics.hospitalDistance} blocks — well above the ideal of 3–5 blocks.`,
      impact: `+${estimatedGain}% healthcare score`,
    });
  } else if (metrics.hospitalDistance > 5) {
    const estimatedGain = Math.min(15, Math.round((metrics.hospitalDistance - 3) * 2));
    suggestions.push({
      action: 'Relocate or add a small clinic near distant residential pockets',
      reason: `Average hospital distance is ${metrics.hospitalDistance} blocks — slightly above optimal.`,
      impact: `+${estimatedGain}% healthcare score`,
    });
  }

  // ─── Green Coverage / Sustainability ───────────────────────────────────
  if (metrics.greenCoverage < 5) {
    // Very low green coverage — critical
    suggestions.push({
      action: 'Add at least 3–4 park zones distributed across residential areas',
      reason: `Green coverage is only ${metrics.greenCoverage}% — critically low for livability and air quality.`,
      impact: '+20–30% sustainability score',
    });
  } else if (metrics.greenCoverage < 10) {
    const estimatedGain = Math.round((15 - metrics.greenCoverage) * 2);
    suggestions.push({
      action: 'Add 1–2 more parks near residential zones',
      reason: `Green coverage is ${metrics.greenCoverage}% — below the recommended 15% threshold.`,
      impact: `+${estimatedGain}% sustainability score`,
    });
  } else if (metrics.parkDistance > 4) {
    // Coverage is OK but parks are far from homes
    suggestions.push({
      action: 'Redistribute parks closer to residential clusters',
      reason: `Parks exist (${metrics.greenCoverage}% coverage) but average distance from homes is ${metrics.parkDistance} blocks.`,
      impact: '+10–15% walkability score',
    });
  }

  // ─── Road Connectivity ─────────────────────────────────────────────────
  if (metrics.roadCoverage < 8) {
    suggestions.push({
      action: 'Expand road network to connect isolated zones',
      reason: `Road coverage is only ${metrics.roadCoverage}% — many zones may be inaccessible.`,
      impact: '+15–25% traffic flow score',
    });
  } else if (metrics.roadCoverage > 30) {
    const excess = Math.round(metrics.roadCoverage - 25);
    suggestions.push({
      action: `Convert ${excess}% excess road cells to parks or residential zones`,
      reason: `Road coverage is ${metrics.roadCoverage}% — significantly over the optimal 15–25% range, wasting usable land.`,
      impact: '+10% sustainability, +5% density',
    });
  }

  if (metrics.roadConnectivity < 70) {
    suggestions.push({
      action: 'Connect fragmented road segments into a continuous network',
      reason: `Only ${metrics.roadConnectivity}% of road cells are connected to other roads — creating dead-end streets.`,
      impact: '+10–20% traffic flow score',
    });
  }

  // ─── Walkability (Commercial Access) ───────────────────────────────────
  if (metrics.commercialDistance > 6 && metrics.counts.commercial > 0) {
    suggestions.push({
      action: 'Add commercial zones near residential clusters to reduce commute distance',
      reason: `Average distance from homes to shops is ${metrics.commercialDistance} blocks.`,
      impact: '+10–15% walkability score',
    });
  } else if (metrics.counts.commercial === 0 && metrics.counts.residential > 0) {
    suggestions.push({
      action: 'Add commercial zones to provide jobs and services to residents',
      reason: 'No commercial zones exist. Residents have no access to shops or workplaces.',
      impact: '+15–20% walkability score',
    });
  }

  // ─── School Access ─────────────────────────────────────────────────────
  if (metrics.counts.school === 0 && metrics.counts.residential > 5) {
    const centroid = metrics.largestResidentialCluster?.centroid;
    const locationHint = centroid
      ? `near (${centroid.x}, ${centroid.y})`
      : 'in a residential area';

    suggestions.push({
      action: `Add a school ${locationHint}`,
      reason: 'No educational facilities exist. Families require nearby schools.',
      impact: '+10% livability score',
    });
  } else if (metrics.schoolDistance > 6) {
    suggestions.push({
      action: 'Add a school closer to residential areas',
      reason: `Average school distance is ${metrics.schoolDistance} blocks — too far for safe student commutes.`,
      impact: '+8% livability score',
    });
  }

  // ─── Industrial Separation ─────────────────────────────────────────────
  if (metrics.counts.industrial > 0 && metrics.counts.residential > 0) {
    // Check if industrial is adjacent to residential (simple heuristic)
    const industrialCells = [];
    const residentialSet = new Set();

    // We work from metrics.counts only — for adjacency we'd need the grid.
    // Use a simplified heuristic: if both exist and layout is small,
    // they're likely adjacent
    if (metrics.totalCells < 200 && metrics.counts.industrial > 3) {
      suggestions.push({
        action: 'Add buffer zones (parks or roads) between industrial and residential areas',
        reason: 'Industrial zones near homes reduce air quality and livability.',
        impact: '+5–10% sustainability score',
      });
    }
  }

  // ─── Density Balance ───────────────────────────────────────────────────
  const residentialRatio = metrics.counts.residential / Math.max(1, metrics.totalCells - metrics.counts.road);
  if (residentialRatio > 0.6) {
    suggestions.push({
      action: 'Diversify land use — replace some residential zones with commercial or parks',
      reason: `${Math.round(residentialRatio * 100)}% of usable land is residential — creating a mono-use zone with poor walkability.`,
      impact: '+10% walkability, +5% sustainability',
    });
  }

  return suggestions;
}
