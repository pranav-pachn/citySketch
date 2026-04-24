import { calculateScores } from './scoringEngine.js';

export function generateInsights(grid) {
  const scores = calculateScores(grid);
  const insights = [];
  const suggestions = [];

  // Healthcare
  if (scores.metrics.residentialCount > 0 && scores.metrics.hospitalCount === 0) {
    insights.push("No healthcare facilities found in the city.");
    suggestions.push("Place a hospital near residential zones.");
  } else if (scores.healthcare < 50) {
    insights.push("Hospital is too far from residential area.");
    suggestions.push("Consider placing an additional hospital closer to distant residential zones.");
  } else if (scores.healthcare > 80) {
    insights.push("Healthcare access is excellent across the city.");
  }

  // Sustainability
  if (scores.metrics.greenRatio < 0.1) {
    insights.push("Low percentage of green zones.");
    suggestions.push("Adding a park will improve sustainability.");
  } else if (scores.sustainability > 80) {
    insights.push("High sustainability score thanks to abundant green zones.");
  }

  // Walkability
  if (scores.walkability < 50) {
    insights.push("Residential areas are too far from commercial zones and parks.");
    suggestions.push("Place more shops or parks near the residential clusters to improve walkability.");
  } else if (scores.walkability > 80) {
    insights.push("Excellent walkability! Most homes are within short walking distance to shops or parks.");
  }

  // Traffic
  if (scores.metrics.roadRatio < 0.1) {
    insights.push("Road connectivity is insufficient.");
    suggestions.push("Expand the road network to connect isolated zones.");
  } else if (scores.metrics.roadRatio > 0.35) {
    insights.push("Too much space is dedicated to roads, reducing usable land.");
    suggestions.push("Remove unnecessary roads and consider replacing them with parks or residential zones.");
  } else if (scores.traffic > 80) {
    insights.push("Traffic efficiency is optimized with a balanced road network.");
  }

  return {
    scores: {
      overall: scores.overall,
      walkability: scores.walkability,
      healthcare: scores.healthcare,
      traffic: scores.traffic,
      sustainability: scores.sustainability
    },
    insights,
    suggestions
  };
}
