import { Router } from 'express'
import { generateInsights } from '../utils/explainer.js'
import { calculateScores } from '../utils/scoringEngine.js'

export const simulateRoute = Router()

simulateRoute.post('/simulate', async (req, res) => {
  const { grid, modifications } = req.body || {}

  if (!grid || !Array.isArray(grid)) {
    return res.status(400).json({ error: 'grid is required' })
  }

  // Deep copy grid
  const newGrid = JSON.parse(JSON.stringify(grid))
  const rows = newGrid.length
  const cols = newGrid[0].length

  const { populationIncrease, removeRoads, addBuildings } = modifications || {}

  const originalScores = calculateScores(grid)

  // 1. Population Increase (convert some empty/park to residential)
  if (populationIncrease) {
    let converted = 0
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (newGrid[y][x].type === 'empty' || newGrid[y][x].type === 'park') {
          if (Math.random() < 0.2) { // 20% chance
            newGrid[y][x].type = 'residential'
            converted++
          }
        }
      }
    }
  }

  // 2. Remove Roads (convert some roads to empty)
  if (removeRoads) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (newGrid[y][x].type === 'road') {
          if (Math.random() < 0.3) { // remove 30% of roads
            newGrid[y][x].type = 'empty'
          }
        }
      }
    }
  }

  // 3. Add Buildings (convert some empty to commercial/industrial)
  if (addBuildings) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (newGrid[y][x].type === 'empty') {
          if (Math.random() < 0.25) { 
            newGrid[y][x].type = Math.random() > 0.5 ? 'commercial' : 'industrial'
          }
        }
      }
    }
  }

  // Re-evaluate
  const evaluation = generateInsights(newGrid)
  const newScores = evaluation.scores

  // Impact analysis
  const impactAnalysis = []
  if (newScores.overall > originalScores.overall) {
    impactAnalysis.push(`Overall city score improved from ${originalScores.overall} to ${newScores.overall}.`)
  } else if (newScores.overall < originalScores.overall) {
    impactAnalysis.push(`Overall city score decreased from ${originalScores.overall} to ${newScores.overall}.`)
  } else {
    impactAnalysis.push(`Overall score remained unchanged at ${newScores.overall}.`)
  }

  if (newScores.walkability < originalScores.walkability) {
    impactAnalysis.push('Walkability worsened due to increased density without corresponding commercial/park access.')
  }
  if (newScores.traffic < originalScores.traffic) {
    impactAnalysis.push('Traffic efficiency dropped, likely due to road removals.')
  }
  if (newScores.sustainability < originalScores.sustainability) {
    impactAnalysis.push('Sustainability was negatively impacted by the loss of green space.')
  }

  res.json({
    layout: newGrid,
    score: newScores.overall,
    breakdown: newScores,
    suggestions: evaluation.suggestions,
    impactAnalysis,
    insights: evaluation.insights
  })
})
