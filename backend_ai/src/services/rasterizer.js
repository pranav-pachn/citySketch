/**
 * Rasterizer service to convert OSM geometry into a normalized grid
 */
export class Rasterizer {
  /**
   * Rasterize OSM data into an NxN grid
   * @param {Object} osmData - Processed OSM data from osmService
   * @param {Array} bbox - [minlat, minlon, maxlat, maxlon]
   * @param {number} gridSize - The size of the grid (e.g., 20)
   * @returns {Array} - 2D grid of cell types
   */
  rasterize(osmData, bbox, gridSize = 20) {
    const [minLat, minLon, maxLat, maxLon] = bbox;
    
    // Initialize empty grid
    const grid = Array.from({ length: gridSize }, () => 
      Array.from({ length: gridSize }, () => 'empty')
    );

    const latStep = (maxLat - minLat) / gridSize;
    const lonStep = (maxLon - minLon) / gridSize;

    // Process each way
    osmData.ways.forEach(way => {
      const type = way.type;
      if (type === 'other') return;

      // For roads and small features, we can just rasterize the points/lines
      // For buildings and parks, ideally we'd fill the polygon, but for MVP
      // we'll start with a simple point-in-cell approach or line rasterization
      
      way.coordinates.forEach(coord => {
        const x = Math.floor((coord.lon - minLon) / lonStep);
        const y = Math.floor((coord.lat - minLat) / latStep);

        // Map OSM Y to our grid Y (which usually starts from top-left)
        // Latitudes increase upwards, so we invert Y
        const gridY = gridSize - 1 - y;
        const gridX = x;

        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
          // Priority system: water > road > building > park
          const currentType = grid[gridY][gridX];
          if (this.shouldOverride(currentType, type)) {
            grid[gridY][gridX] = type;
          }
        }
      });

      // Simple line rasterization for roads
      if (type === 'road') {
        for (let i = 0; i < way.coordinates.length - 1; i++) {
          this.rasterizeLine(
            way.coordinates[i], 
            way.coordinates[i+1], 
            grid, 
            bbox, 
            gridSize, 
            'road'
          );
        }
      }
    });

    return grid;
  }

  /**
   * Determine if a new type should override the existing type in a cell
   */
  shouldOverride(current, next) {
    const priority = {
      'empty': 0,
      'park': 1,
      'building': 2,
      'road': 3,
      'water': 4
    };
    return (priority[next] || 0) > (priority[current] || 0);
  }

  /**
   * Simple Bresenham-like line rasterization for coordinates
   */
  rasterizeLine(p1, p2, grid, bbox, gridSize, type) {
    const [minLat, minLon, maxLat, maxLon] = bbox;
    const latStep = (maxLat - minLat) / gridSize;
    const lonStep = (maxLon - minLon) / gridSize;

    let x1 = (p1.lon - minLon) / lonStep;
    let y1 = gridSize - 1 - ((p1.lat - minLat) / latStep);
    let x2 = (p2.lon - minLon) / lonStep;
    let y2 = gridSize - 1 - ((p2.lat - minLat) / latStep);

    // Number of steps for interpolation
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
    if (steps < 1) return;

    for (let i = 0; i <= steps; i++) {
      const x = Math.floor(x1 + (x2 - x1) * (i / steps));
      const y = Math.floor(y1 + (y2 - y1) * (i / steps));

      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        if (this.shouldOverride(grid[y][x], type)) {
          grid[y][x] = type;
        }
      }
    }
  }
}

export const rasterizer = new Rasterizer();
