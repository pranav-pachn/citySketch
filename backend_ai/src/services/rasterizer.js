/**
 * Rasterizer service to convert OSM geometry into a normalized grid
 */
export class Rasterizer {
  rasterize(osmData, bbox, gridSize = 20) {
    const [minLat, minLon, maxLat, maxLon] = bbox;

    const grid = Array.from({ length: gridSize }, (_, y) =>
      Array.from({ length: gridSize }, (_, x) => ({
        x,
        y,
        type: 'empty',
        elevation: 0,
        isLocked: false,
        sourceTags: null,
        sourceWayId: null,
      }))
    );

    const lockedCells = new Set();
    const latStep = (maxLat - minLat) / gridSize;
    const lonStep = (maxLon - minLon) / gridSize;
    const priority = { empty: 0, park: 1, building: 2, road: 3, water: 4 };

    const isMajorRoad = (tags) => ['primary', 'secondary', 'trunk', 'motorway'].includes(tags?.highway);

    const cellForCoord = (coord) => {
      const x = Math.floor((coord.lon - minLon) / lonStep);
      const y = (gridSize - 1) - Math.floor((coord.lat - minLat) / latStep);
      return { x, y };
    };

    const setCell = (x, y, type, way) => {
      if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
      const cell = grid[y][x];
      if ((priority[type] || 0) < (priority[cell.type] || 0)) return;

      const majorRoad = type === 'road' && isMajorRoad(way?.tags);
      if (cell.isLocked && cell.type === 'water' && type !== 'water') return;
      if (cell.isLocked && cell.type === 'road' && !majorRoad) return;

      cell.type = type;
      cell.sourceTags = way?.tags || null;
      cell.sourceWayId = way?.id ?? null;
      cell.isLocked = type === 'water' || majorRoad;
      if (cell.isLocked) {
        lockedCells.add(`${x},${y}`);
      }
    };

    const rasterizeLine = (p1, p2, type, way) => {
      const start = cellForCoord(p1);
      const end = cellForCoord(p2);
      const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) * 2;

      if (steps < 1) {
        setCell(start.x, start.y, type, way);
        return;
      }

      for (let i = 0; i <= steps; i += 1) {
        const x = Math.floor(start.x + (end.x - start.x) * (i / steps));
        const y = Math.floor(start.y + (end.y - start.y) * (i / steps));
        setCell(x, y, type, way);
      }
    };

    const rasterizePolygonEdges = (coords, type, way) => {
      if (!Array.isArray(coords) || coords.length === 0) return;
      for (let i = 0; i < coords.length - 1; i += 1) {
        rasterizeLine(coords[i], coords[i + 1], type, way);
      }
      if (coords.length > 2) {
        rasterizeLine(coords[coords.length - 1], coords[0], type, way);
      }
    };

    (osmData.ways || []).forEach((way) => {
      const type = way.type;
      if (type === 'other') return;

      if (type === 'road') {
        for (let i = 0; i < way.coordinates.length - 1; i += 1) {
          rasterizeLine(way.coordinates[i], way.coordinates[i + 1], 'road', way);
        }
        return;
      }

      rasterizePolygonEdges(way.coordinates, type, way);
      way.coordinates.forEach((coord) => {
        const { x, y } = cellForCoord(coord);
        setCell(x, y, type, way);
      });
    });

    return {
      grid,
      lockedCells,
      bbox: [minLat, minLon, maxLat, maxLon],
      gridSize,
    };
  }
}

export const rasterizer = new Rasterizer();
