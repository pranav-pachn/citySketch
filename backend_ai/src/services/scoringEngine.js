import { calculateScores as unifiedCalculateScores, getScoreCategory, getScoreLabel } from '../../../utils/scoring.js'
import { analyzeLayout } from './analyzer.js'

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)) }

export function calculateScores(grid) {
  // Use the unified scoring calculation as a base
  const unified = unifiedCalculateScores(grid)

  // Derive an overall numeric score (liveability) if present
  const overall = unified?.metrics?.liveability?.value ?? null

  // Walkability & traffic & sustainability come from unified metrics where available
  const walkability = unified?.metrics?.walkability?.value ?? 0
  const traffic = unified?.metrics?.traffic?.value ?? 0
  const sustainability = unified?.metrics?.sustainability?.value ?? 0

  // For healthcare we use analyzeLayout to compute hospital distance and counts
  const metrics = analyzeLayout(grid)
  let healthcare = 0
  let avgHealthcareDistance = 0
  if (metrics.counts && metrics.counts.residential > 0) {
    if ((metrics.counts.hospital || 0) === 0) {
      healthcare = 0
    } else {
      avgHealthcareDistance = metrics.hospitalDistance || 0
      healthcare = Math.max(0, 100 - ((avgHealthcareDistance - 3) * (100 / 17)))
      healthcare = clamp(healthcare, 0, 100)
    }
  } else {
    healthcare = 100
  }

  const overallScore = overall !== null ? Math.round(overall) : Math.round(
    0.3 * walkability + 0.25 * healthcare + 0.25 * traffic + 0.2 * sustainability
  )

  return {
    overall: overallScore,
    walkability: Math.round(walkability),
    healthcare: Math.round(healthcare),
    traffic: Math.round(traffic),
    sustainability: Math.round(sustainability),
    distances: {
      walkability: unified?.metrics?.walkability?.averageDistance ?? 0,
      healthcare: Math.round(avgHealthcareDistance * 10) / 10,
    },
    labels: {
      walkability: getScoreCategory('walkability', walkability),
      traffic: getScoreCategory('traffic', traffic),
      healthcare: getScoreCategory('healthcare', healthcare),
      sustainability: getScoreCategory('sustainability', sustainability),
    },
    metrics: {
      residentialCount: metrics.counts.residential || 0,
      hospitalCount: metrics.counts.hospital || 0,
      shopParkCount: (metrics.counts.commercial || 0) + (metrics.counts.park || 0),
      parkCount: metrics.counts.park || 0,
      greenRatio: metrics.greenCoverage ? metrics.greenCoverage / 100 : 0,
      roadRatio: metrics.roadCoverage ? metrics.roadCoverage / 100 : 0,
    }
  }
}
