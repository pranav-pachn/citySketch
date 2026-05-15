import { CityGenerator } from '../backend_ai/src/services/generator/CityGenerator.js'

function summarize(grid) {
  const counts = {}
  for (const row of grid) {
    for (const cell of row) {
      counts[cell.type] = (counts[cell.type] || 0) + 1
    }
  }
  return counts
}

async function run() {
  const engine = new CityGenerator({ eco: true, trafficLevel: 'low', density: 'high', gridSize: 20 })
  const grid = engine.generate()
  const counts = summarize(grid)
  console.log('counts:', counts)
  // print small sample
  console.log('sample cell [10][10]:', grid[10][10])
}

run().catch(e=>{console.error(e); process.exit(1)})
