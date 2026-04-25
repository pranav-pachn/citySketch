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
 *
 * @param {object} metrics - Output from analyzeLayout()
 * @param {object} scores  - Output from calculateScores()
 * @returns {Array<{message: string, severity: 'critical'|'warning'|'good'}>}
 */
function buildExplanations(metrics, scores) {
  const explanations = [];

  // ─── Healthcare Access ─────────────────────────────────────────────────
  if (metrics.counts.residential > 0 && metrics.counts.hospital === 0) {
    explanations.push(insight(
      'No healthcare facilities found in the city. Residents have zero emergency access.',
      'critical'
    ));
  } else if (metrics.hospitalDistance > 8) {
    explanations.push(insight(
      `Hospitals are too far from residential areas (avg ${metrics.hospitalDistance} blocks). Healthcare accessibility is severely limited.`,
      'critical'
    ));
  } else if (metrics.hospitalDistance > 5) {
    explanations.push(insight(
      `Hospital access is moderate — average distance of ${metrics.hospitalDistance} blocks from homes. Closer placement would improve emergency response.`,
      'warning'
    ));
  } else if (metrics.hospitalDistance <= 5 && metrics.counts.hospital > 0) {
    explanations.push(insight(
      `Excellent healthcare access — hospitals are within ${metrics.hospitalDistance} blocks of residential areas on average.`,
      'good'
    ));
  }

  // ─── Green Coverage / Sustainability ───────────────────────────────────
  if (metrics.greenCoverage < 5) {
    explanations.push(insight(
      `Green coverage is critically low at ${metrics.greenCoverage}%. Cities need at least 15% green space for healthy air quality and recreation.`,
      'critical'
    ));
  } else if (metrics.greenCoverage < 10) {
    explanations.push(insight(
      `Green coverage is ${metrics.greenCoverage}% — below the recommended 15% minimum. Adding parks will improve sustainability and livability.`,
      'warning'
    ));
  } else if (metrics.greenCoverage >= 15) {
    explanations.push(insight(
      `Strong green coverage at ${metrics.greenCoverage}%. The city provides ample recreational and environmental space.`,
      'good'
    ));
  } else {
    explanations.push(insight(
      `Green coverage is adequate at ${metrics.greenCoverage}%, approaching the 15% target.`,
      'good'
    ));
  }

  // ─── Road Network ──────────────────────────────────────────────────────
  if (metrics.roadCoverage < 8) {
    explanations.push(insight(
      `Road network is insufficient — only ${metrics.roadCoverage}% coverage. Many zones may be inaccessible by vehicle.`,
      'critical'
    ));
  } else if (metrics.roadCoverage > 30) {
    explanations.push(insight(
      `Too much space dedicated to roads (${metrics.roadCoverage}%). This reduces usable land for housing and parks.`,
      'warning'
    ));
  } else if (metrics.roadConnectivity >= 85) {
    explanations.push(insight(
      `Road connectivity is excellent — ${metrics.roadConnectivity}% of road segments are interconnected.`,
      'good'
    ));
  } else if (metrics.roadConnectivity < 60) {
    explanations.push(insight(
      `Road network is fragmented — only ${metrics.roadConnectivity}% connectivity. Several dead-end streets detected.`,
      'warning'
    ));
  } else {
    explanations.push(insight(
      `Road network is functional with ${metrics.roadCoverage}% coverage and ${metrics.roadConnectivity}% connectivity.`,
      'good'
    ));
  }

  // ─── Walkability ───────────────────────────────────────────────────────
  if (scores.walkability < 40) {
    explanations.push(insight(
      `Walkability is poor — residential areas are far from shops and parks. Average distance to commercial zones: ${metrics.commercialDistance} blocks.`,
      'critical'
    ));
  } else if (scores.walkability < 65) {
    explanations.push(insight(
      `Walkability is moderate. Some homes have convenient access to amenities but outlying areas need improvement.`,
      'warning'
    ));
  } else {
    explanations.push(insight(
      `Excellent walkability — most homes are within short walking distance to shops, parks, and services.`,
      'good'
    ));
  }

  // ─── School Access ─────────────────────────────────────────────────────
  if (metrics.counts.school === 0 && metrics.counts.residential > 5) {
    explanations.push(insight(
      'No educational facilities found. Families with children will have no access to local schools.',
      'warning'
    ));
  } else if (metrics.schoolDistance > 6) {
    explanations.push(insight(
      `Schools are ${metrics.schoolDistance} blocks from residential areas on average — exceeding safe walking distance for students.`,
      'warning'
    ));
  }

  // ─── Overall Assessment ────────────────────────────────────────────────
  const overallScore = scores.overall;
  if (overallScore >= 80) {
    explanations.push(insight(
      `This layout scores ${overallScore}/100 — a well-planned city with strong livability fundamentals.`,
      'good'
    ));
  } else if (overallScore >= 55) {
    explanations.push(insight(
      `This layout scores ${overallScore}/100 — functional but with room for improvement in key areas.`,
      'warning'
    ));
  } else {
    explanations.push(insight(
      `This layout scores ${overallScore}/100 — significant planning issues detected that impact livability.`,
      'critical'
    ));
  }

  return explanations;
}

/**
 * Generate a one-line natural language summary of the layout.
 */
function buildSummary(metrics, scores) {
  const score = scores.overall;
  const issues = [];

  if (metrics.counts.hospital === 0) issues.push('no hospitals');
  else if (metrics.hospitalDistance > 6) issues.push('distant hospitals');

  if (metrics.greenCoverage < 10) issues.push('low green coverage');
  if (metrics.roadCoverage < 8) issues.push('insufficient roads');
  if (scores.walkability < 50) issues.push('poor walkability');

  if (issues.length === 0) {
    return `This layout has ${score}% livability. The city is well-balanced with good access to healthcare, parks, and services.`;
  }

  const issueStr = issues.join(', ');
  return `This layout has ${score}% livability. Key issues: ${issueStr}. See suggestions below for improvements with measurable impact.`;
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
    },
    scores: {
      overall: scores.overall,
      walkability: scores.walkability,
      healthcare: scores.healthcare,
      traffic: scores.traffic,
      sustainability: scores.sustainability,
    },
    explanations,
    suggestions,
    summary,
  };
}
