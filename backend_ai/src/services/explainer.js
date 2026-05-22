// ═══════════════════════════════════════════════════════════════════════════
// explainer.js — Human-Readable Insight Engine for CitySketch
// ═══════════════════════════════════════════════════════════════════════════
//
// Converts raw metrics (from analyzer.js) and scores (from scoringEngine.js)
// into plain-language insights a non-technical user can understand.
//
// Each insight is tagged with a severity: 'critical' | 'warning' | 'good'
// so the frontend can color-code them.

import { analyzeLayout } from './analyzer.js';
import { calculateScores } from './scoringEngine.js';
import { generateSuggestions } from './suggester.js';

/**
 * Generate a single insight object.
 */
function insight(message, severity = 'warning') {
  return { message, severity };
}

/**
 * Build human-readable explanations from analyzed metrics.
 * Now with location-aware, dynamic insights!
 *
 * @param {object} metrics - Output from analyzeLayout()
 * @param {object} scores  - Output from calculateScores()
 * @returns {Array<{message: string, severity: 'critical'|'warning'|'good'}>}
 */
function buildExplanations(metrics, scores) {
  const explanations = [];
  const placements = metrics.placements || { parks: [], hospitals: [], schools: [], commercial: [] };
  const residential = metrics.largestResidentialCluster;

  // ─── Healthcare Access ─────────────────────────────────────────────────
  if (metrics.counts.residential > 0 && metrics.counts.hospital === 0) {
    explanations.push(insight(
      'No healthcare facilities found in the city. Residents have zero emergency access.',
      'critical'
    ));
  } else if (metrics.counts.hospital > 0) {
    const hospitals = placements.hospitals || [];
    if (hospitals.length > 0) {
      const coords = hospitals.map(h => `(${h.x},${h.y})`).join(', ');
      if (metrics.hospitalDistance > 8) {
        explanations.push(insight(
          `Hospitals at ${coords} are too far from residential areas (avg ${metrics.hospitalDistance} blocks). Healthcare accessibility is severely limited. Consider relocating closer to populated zones.`,
          'critical'
        ));
      } else if (metrics.hospitalDistance > 5) {
        explanations.push(insight(
          `Hospitals strategically placed at ${coords} — average distance of ${metrics.hospitalDistance} blocks from homes. Closer placement would improve emergency response times.`,
          'warning'
        ));
      } else if (metrics.hospitalDistance <= 5) {
        explanations.push(insight(
          `Excellent healthcare access — hospitals at ${coords} are within ${metrics.hospitalDistance} blocks of residential areas on average. Emergency response time: ~${Math.round(metrics.hospitalDistance * 2)} minutes.`,
          'good'
        ));
      }
    }
  }

  // ─── Green Coverage / Sustainability ───────────────────────────────────
  if (metrics.counts.park > 0) {
    const parks = placements.parks || [];
    const parkCoords = parks.slice(0, 2).map(p => `(${p.x},${p.y})`).join(', ');
    const moreParks = parks.length > 2 ? ` plus ${parks.length - 2} more` : '';
    
    if (metrics.greenCoverage < 5) {
      explanations.push(insight(
        `Parks placed at ${parkCoords}${moreParks}, but green coverage remains critically low at ${metrics.greenCoverage}%. Cities need at least 15% green space for air quality. Add parks near unserviced residential clusters.`,
        'critical'
      ));
    } else if (metrics.greenCoverage < 10) {
      explanations.push(insight(
        `Parks strategically distributed at ${parkCoords}${moreParks} with ${metrics.greenCoverage}% green coverage. Approaching recommended 15% target—adding one more park cluster would significantly improve sustainability.`,
        'warning'
      ));
    } else if (metrics.greenCoverage >= 15) {
      explanations.push(insight(
        `Strong green coverage at ${metrics.greenCoverage}% with parks at ${parkCoords}${moreParks}. Excellent recreational and environmental spacing—residents have good access to nature.`,
        'good'
      ));
    } else {
      explanations.push(insight(
        `Good park distribution at ${parkCoords}${moreParks} with ${metrics.greenCoverage}% green coverage. This provides balanced outdoor access while maintaining urban density.`,
        'good'
      ));
    }
  } else if (metrics.greenCoverage < 10) {
    explanations.push(insight(
      `No parks in this layout — ${metrics.greenCoverage}% green coverage. The city is severely lacking recreational space. Add parks near residential clusters to improve livability.`,
      'critical'
    ));
  }

  // ─── Road Network ──────────────────────────────────────────────────────
  if (metrics.roadCoverage < 8) {
    explanations.push(insight(
      `Road network is insufficient — only ${metrics.roadCoverage}% coverage with ${metrics.roadConnectivity}% connectivity. Many zones may be inaccessible by vehicle. Add connecting roads.`,
      'critical'
    ));
  } else if (metrics.roadCoverage > 30) {
    explanations.push(insight(
      `Too much space dedicated to roads (${metrics.roadCoverage}%). This reduces usable land for housing and parks. Consider a more efficient street pattern.`,
      'warning'
    ));
  } else if (metrics.roadConnectivity >= 85) {
    explanations.push(insight(
      `Excellent road network — ${metrics.roadCoverage}% coverage with ${metrics.roadConnectivity}% of roads well-connected. Traffic flows efficiently through the city.`,
      'good'
    ));
  } else if (metrics.roadConnectivity < 60) {
    explanations.push(insight(
      `Road network is fragmented with only ${metrics.roadConnectivity}% connectivity. Dead-end streets detected with ${metrics.roadCoverage}% coverage. Improve intersections for better flow.`,
      'warning'
    ));
  } else {
    explanations.push(insight(
      `Road network is functional with ${metrics.roadCoverage}% coverage and ${metrics.roadConnectivity}% connectivity. Traffic patterns are stable.`,
      'good'
    ));
  }

  // ─── Walkability ───────────────────────────────────────────────────────
  if (scores.walkability < 40) {
    explanations.push(insight(
      `Walkability is poor — residential areas are far from amenities (${metrics.parkDistance} blocks to nearest park). ${residential && residential.centroid ? `Largest cluster at (${residential.centroid.x},${residential.centroid.y}) is isolated.` : ''} Consolidate services near housing.`,
      'critical'
    ));
  } else if (scores.walkability < 65) {
    explanations.push(insight(
      `Walkability is moderate with amenities averaging ${metrics.parkDistance} blocks away. Some homes have convenient access, but outlying residential areas need improvement.`,
      'warning'
    ));
  } else {
    const schools = placements.schools || [];
    const schoolCoords = schools.length > 0 ? ` Schools at ${schools.slice(0, 2).map(s => `(${s.x},${s.y})`).join(', ')} also contribute.` : '';
    explanations.push(insight(
      `Excellent walkability — most homes are within short walking distance (${metrics.parkDistance} blocks) to parks and services.${schoolCoords}`,
      'good'
    ));
  }

  // ─── School Access ─────────────────────────────────────────────────────
  if (metrics.counts.school === 0 && metrics.counts.residential > 5) {
    explanations.push(insight(
      'No educational facilities found. Families with children will have no access to local schools.',
      'warning'
    ));
  } else if (metrics.counts.school > 0 && metrics.schoolDistance > 6) {
    const schools = placements.schools || [];
    const coords = schools.map(s => `(${s.x},${s.y})`).join(', ');
    explanations.push(insight(
      `Schools at ${coords} are ${metrics.schoolDistance} blocks from residential areas — exceeding safe walking distance for students. Relocate closer to population centers.`,
      'warning'
    ));
  }

  // ─── Overall Assessment ────────────────────────────────────────────────
  const overallScore = scores.overall;
  if (overallScore >= 80) {
    explanations.push(insight(
      `This layout scores ${overallScore}/100 — a well-planned city with strong livability fundamentals and strategic feature placement.`,
      'good'
    ));
  } else if (overallScore >= 55) {
    explanations.push(insight(
      `This layout scores ${overallScore}/100 — functional but with room for improvement in key areas like park distribution or road connectivity.`,
      'warning'
    ));
  } else {
    explanations.push(insight(
      `This layout scores ${overallScore}/100 — significant planning issues detected affecting livability. Review park placement and road connectivity above.`,
      'critical'
    ));
  }

  // ─── OSM Integration ───────────────────────────────────────────────────
  const lockedCells = metrics.counts?.locked || 0;
  if (lockedCells > 0) {
    explanations.push(insight(
      `Generated layout successfully integrated with ${lockedCells} real-world geographic constraints from OpenStreetMap. New zoning respects existing roads and water bodies.`,
      'good'
    ));
  }

  return explanations;
}

/**
 * Generate a one-line natural language summary of the layout.
 * Now with location intelligence!
 */
function buildSummary(metrics, scores) {
  const score = scores.overall;
  const issues = [];
  const strengths = [];
  const placements = metrics.placements || { parks: [], hospitals: [] };

  // Analyze issues
  if (metrics.counts.hospital === 0) issues.push('no hospitals');
  else if (metrics.hospitalDistance > 6) issues.push(`hospitals at (${placements.hospitals.map(h => `${h.x},${h.y}`).join('/')})`);

  if (metrics.greenCoverage < 10) issues.push(`low parks (${metrics.greenCoverage}%)`);
  if (metrics.roadCoverage < 8) issues.push('insufficient roads');
  if (scores.walkability < 50) issues.push('poor walkability');

  // Analyze strengths
  if (metrics.greenCoverage >= 15) strengths.push(`excellent green space (${metrics.greenCoverage}%)`);
  if (metrics.roadConnectivity >= 85) strengths.push('well-connected roads');
  if (scores.walkability >= 75) strengths.push('highly walkable');
  if (metrics.counts.park >= 3) strengths.push(`distributed parks at ${placements.parks.slice(0, 3).map(p => `(${p.x},${p.y})`).join(', ')}`);

  if (strengths.length === 0 && issues.length === 0) {
    return `This layout has ${score}% livability. The city is well-balanced with good access to healthcare, parks, and services.`;
  }

  let summary = `This layout has ${score}% livability.`;
  
  if (strengths.length > 0) {
    summary += ` Strengths: ${strengths.join(', ')}.`;
  }
  
  if (issues.length > 0) {
    summary += ` Issues: ${issues.join(', ')}.`;
  } else if (strengths.length > 0) {
    summary += ` Overall, this is a thoughtfully planned city.`;
  }

  return summary;
}

/**
 * Full insight generation pipeline.
 *
 * This is the single entry point the API route calls.
 * It runs the full analysis → scoring → explanation → suggestion pipeline.
 *
 * @param {GridCell[][]} grid
 * @returns {{ metrics, scores, explanations, suggestions, summary }}
 */
export function generateInsights(grid) {
  // Step 1: Analyze raw spatial metrics
  const metrics = analyzeLayout(grid);

  // Step 2: Compute weighted scores
  const scores = calculateScores(grid);

  // Step 3: Convert metrics into human-readable explanations
  const explanations = buildExplanations(metrics, scores);

  // Step 4: Generate structured suggestions with impact
  const suggestions = generateSuggestions(metrics, scores);

  // Step 5: Build a natural language summary
  const summary = buildSummary(metrics, scores);

  return {
    metrics: {
      hospitalDistance: metrics.hospitalDistance,
      parkDistance: metrics.parkDistance,
      commercialDistance: metrics.commercialDistance,
      schoolDistance: metrics.schoolDistance,
      greenCoverage: metrics.greenCoverage,
      roadCoverage: metrics.roadCoverage,
      roadConnectivity: metrics.roadConnectivity,
      counts: metrics.counts,
      largestResidentialCluster: metrics.largestResidentialCluster,
      placements: metrics.placements,
    },
    scores: {
      overall: scores.overall,
      walkability: scores.walkability,
      healthcare: scores.healthcare,
      traffic: scores.traffic,
      sustainability: scores.sustainability,
      
      // Enhanced score data with labels and distances
      distances: scores.distances,
      labels: scores.labels,
    },
    explanations,
    suggestions,
    summary,
  };
}
