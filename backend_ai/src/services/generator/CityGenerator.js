import { CONFIG } from '../../config/cityConfig.js';

export class CityGenerator {
  constructor(config = {}) {
    // Production Config System
    const gridSize = config.gridSize || CONFIG.gridSize;
    this.width = gridSize;
    this.height = gridSize;
    this.waterMeta = null;
    this.grid = Array.from({ length: this.height }, () => 
      Array.from({ length: this.width }, () => 'empty')
    );
    this.config = {
      waterStyle: config.waterStyle || 'none',
      primaryZone: config.primaryZone || 'commercial',
      density: config.density || 'medium',
      parkStyle: config.parkStyle || 'scattered',
      roadStyle: config.roadStyle || 'grid',
      forestDensity: config.forestDensity || 'normal',
      riverScale: config.riverScale || 'normal',
      hospitalZone: config.hospitalZone || false,
      schoolZone: config.schoolZone || false,
      trafficLevel: config.trafficLevel || 'balanced',
      eco: config.eco || false,
    };
    this.lockedCells = config.lockedCells || new Set();
  }

  isLocked(x, y) {
    return this.lockedCells.has(`${x},${y}`);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  setTileIfNotWater(x, y, type) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    if (this.isLocked(x, y)) return;
    if (this.grid[y][x] !== 'water') this.grid[y][x] = type;
  }

  isEdge(x, y) {
    return x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1;
  }

  getCardinalNeighbors(x, y) {
    const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
    const neighbors = [];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        neighbors.push({ x: nx, y: ny, type: this.grid[ny][nx] });
      }
    }
    return neighbors;
  }

  // Guide Section 3 — Ordered placement pipeline
  generate() {
    this.addWater();
    this.buildRoads();
    this.addStrategicRiverCrossings();
    this.ensureRoadConnectivity();
    // Guide Section 4 — Prioritized zone placement order:
    // residential (first) → park (second) → hospital (third) → commercial (fourth) → school (fifth)
    this.addCoreZoning();
    this.addHospitalZone();
    this.addSchoolZone();
    this.addParks();
    this.fillResidential();
    this.enforceZoningRules();
    this.ensureGlobalConnectivity(); // 🔥 Tech Depth: Graph Traversal Connectivity Check
    
    // Calculate elevation map (distance from water)
    const elevation = Array.from({ length: this.height }, () => Array(this.width).fill(0));
    const queue = [];
    
    // Initialize queue with water tiles (elevation 0)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 'water') {
          elevation[y][x] = 0;
          queue.push({ x, y, dist: 0 });
        } else {
          elevation[y][x] = Infinity;
        }
      }
    }
    
    // If no water, start from the edges
    if (queue.length === 0) {
       for (let y = 0; y < this.height; y++) {
         for (let x = 0; x < this.width; x++) {
           if (this.isEdge(x, y)) {
             elevation[y][x] = 0;
             queue.push({ x, y, dist: 0 });
           }
         }
       }
    }

    // BFS to calculate distance
    const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
    while (queue.length > 0) {
      const { x, y, dist } = queue.shift();
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (elevation[ny][nx] > dist + 1) {
            elevation[ny][nx] = dist + 1;
            queue.push({ x: nx, y: ny, dist: dist + 1 });
          }
        }
      }
    }

    // Convert string array to Array<{x, y, type, elevation, subtype}> strictly matching the frontend expectations
    const finalGrid = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        // Flatten the elevation slightly to make hills look good (step of 0.2 height per distance)
        let cellElevation = elevation[y][x] * 0.15;
        
        // Roads and bridges should be flat or flatten out the terrain.
        if (this.grid[y][x] === 'road') {
           // Average with neighbors or just keep it low
           cellElevation = Math.max(0.05, cellElevation * 0.5);
        } else if (this.grid[y][x] === 'water') {
           cellElevation = 0;
        } else {
           // Add a slight random noise to natural tiles
           cellElevation += (Math.random() * 0.05);
        }

        // Assign context-aware subtype based on neighbors
        const subtype = this.assignSubtype(x, y);

        row.push({ x, y, type: this.grid[y][x], elevation: cellElevation, subtype });
      }
      finalGrid.push(row);
    }
    return finalGrid;
  }

  assignSubtype(x, y) {
    const type = this.grid[y][x];
    const nearWater = this.isAdjacentTo(x, y, 'water');
    const nearRoad = this.isAdjacentTo(x, y, 'road');
    const nearPark = this.isAdjacentTo(x, y, 'park');
    const nearIndustrial = this.isAdjacentTo(x, y, 'industrial');
    const nearResidential = this.isAdjacentTo(x, y, 'residential');
    const isCenter = Math.abs(x - this.width / 2) < 3 && Math.abs(y - this.height / 2) < 3;
    const isEdgeCell = this.isEdge(x, y);

    switch (type) {
      case 'commercial':
        if (nearWater) return 'waterfront_dining';
        if (isCenter) return 'office_tower';
        if (nearPark) return 'boutique_retail';
        if (nearIndustrial) return 'warehouse_outlet';
        return 'office_building';

      case 'residential':
        if (nearWater) return 'waterfront_apartment';
        if (nearPark) return 'garden_villa';
        if (isCenter) return 'urban_apartment';
        if (isEdgeCell) return 'suburban_house';
        if (nearRoad) return 'townhouse';
        return 'family_home';

      case 'industrial':
        if (nearWater) return 'port_facility';
        if (isEdgeCell) return 'logistics_hub';
        if (nearRoad) return 'manufacturing_plant';
        return 'factory';

      case 'park':
        if (nearWater) return 'waterfront_promenade';
        if (isCenter) return 'central_plaza';
        if (isEdgeCell) return 'nature_reserve';
        return 'community_garden';

      case 'road':
        if (nearWater) return 'bridge';
        return 'street';

      case 'water':
        return 'river';

      case 'hospital':
        if (nearRoad) return 'emergency_hospital';
        return 'clinic';

      case 'school':
        if (nearResidential) return 'neighborhood_school';
        if (nearPark) return 'campus_school';
        if (isEdgeCell) return 'campus';
        return 'school_building';

      default:
        return 'vacant_lot';
    }
  }

  addWater() {
    const riverWidth = this.config.riverScale === 'wide' ? 3 : 1;
    this.waterMeta = null;

    if (this.config.waterStyle === 'river_vertical') {
      const center = Math.floor(this.width / 2) - Math.floor(riverWidth / 2);
      const startCol = this.clamp(center + (Math.floor(Math.random() * 3) - 1), 1, this.width - riverWidth - 1);
      this.waterMeta = { type: 'river_vertical', startCol, width: riverWidth };
      for (let y = 0; y < this.height; y++) {
        for (let w = 0; w < riverWidth; w++) {
          if (!this.isLocked(startCol + w, y)) {
            this.grid[y][startCol + w] = 'water';
          }
        }
      }
    } else if (this.config.waterStyle === 'river_horizontal') {
      const center = Math.floor(this.height / 2) - Math.floor(riverWidth / 2);
      const startRow = this.clamp(center + (Math.floor(Math.random() * 3) - 1), 1, this.height - riverWidth - 1);
      this.waterMeta = { type: 'river_horizontal', startRow, width: riverWidth };
      for (let x = 0; x < this.width; x++) {
        for (let w = 0; w < riverWidth; w++) {
          if (!this.isLocked(x, startRow + w)) {
            this.grid[startRow + w][x] = 'water';
          }
        }
      }
    } else if (this.config.waterStyle === 'coastal_left') {
      for (let y = 0; y < this.height; y++) { 
        if (!this.isLocked(0, y)) this.grid[y][0] = 'water'; 
        if (!this.isLocked(1, y)) this.grid[y][1] = 'water'; 
      }
    } else if (this.config.waterStyle === 'coastal_right') {
      for (let y = 0; y < this.height; y++) { 
        if (!this.isLocked(this.width-1, y)) this.grid[y][this.width-1] = 'water'; 
        if (!this.isLocked(this.width-2, y)) this.grid[y][this.width-2] = 'water'; 
      }
    } else if (this.config.waterStyle === 'lake_center') {
      const cx = Math.floor(this.width/2);
      const cy = Math.floor(this.height/2);
      if (!this.isLocked(cx-1, cy-1)) this.grid[cy-1][cx-1] = 'water'; 
      if (!this.isLocked(cx, cy-1)) this.grid[cy-1][cx] = 'water';
      if (!this.isLocked(cx-1, cy)) this.grid[cy][cx-1] = 'water'; 
      if (!this.isLocked(cx, cy)) this.grid[cy][cx] = 'water';
    }
  }

  addStrategicRiverCrossings() {
    if (!this.waterMeta) return;

    const bridgeCount = this.config.density === 'high' ? 2 : 1;
    if (this.waterMeta.type === 'river_vertical') {
      const rows = [Math.floor(this.height / 2)];
      if (bridgeCount > 1) rows.push(this.clamp(Math.floor(this.height * 0.25), 1, this.height - 2));

      for (const y of [...new Set(rows)]) {
        for (let w = 0; w < this.waterMeta.width; w++) {
          this.grid[y][this.waterMeta.startCol + w] = 'road';
        }
        this.setTileIfNotWater(this.waterMeta.startCol - 1, y, 'road');
        this.setTileIfNotWater(this.waterMeta.startCol + this.waterMeta.width, y, 'road');
      }
    }

    if (this.waterMeta.type === 'river_horizontal') {
      const cols = [Math.floor(this.width / 2)];
      if (bridgeCount > 1) cols.push(this.clamp(Math.floor(this.width * 0.25), 1, this.width - 2));

      for (const x of [...new Set(cols)]) {
        for (let w = 0; w < this.waterMeta.width; w++) {
          this.grid[this.waterMeta.startRow + w][x] = 'road';
        }
        this.setTileIfNotWater(x, this.waterMeta.startRow - 1, 'road');
        this.setTileIfNotWater(x, this.waterMeta.startRow + this.waterMeta.width, 'road');
      }
    }
  }

  getRoadComponents() {
    const seen = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const components = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (seen[y][x] || this.grid[y][x] !== 'road') continue;
        const queue = [{ x, y }];
        const component = [];
        seen[y][x] = true;

        while (queue.length > 0) {
          const current = queue.pop();
          component.push(current);

          for (const neighbor of this.getCardinalNeighbors(current.x, current.y)) {
            if (seen[neighbor.y][neighbor.x] || this.grid[neighbor.y][neighbor.x] !== 'road') continue;
            seen[neighbor.y][neighbor.x] = true;
            queue.push({ x: neighbor.x, y: neighbor.y });
          }
        }

        components.push(component);
      }
    }

    return components;
  }

  carveRoadPath(fromX, fromY, toX, toY) {
    let x = fromX;
    let y = fromY;
    const horizontalFirst = Math.random() < 0.5;

    const stepHorizontal = () => {
      while (x !== toX) {
        x += toX > x ? 1 : -1;
        if (!this.isLocked(x, y)) this.grid[y][x] = 'road';
      }
    };

    const stepVertical = () => {
      while (y !== toY) {
        y += toY > y ? 1 : -1;
        if (!this.isLocked(x, y)) this.grid[y][x] = 'road';
      }
    };

    if (horizontalFirst) {
      stepHorizontal();
      stepVertical();
    } else {
      stepVertical();
      stepHorizontal();
    }
  }

  ensureRoadConnectivity() {
    let components = this.getRoadComponents();
    let guard = 0;

    while (components.length > 1 && guard < 24) {
      components.sort((a, b) => b.length - a.length);
      const base = components[0];
      let best = null;

      for (let i = 1; i < components.length; i++) {
        const candidate = components[i];
        for (const a of base) {
          for (const b of candidate) {
            const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
            if (!best || dist < best.dist) {
              best = { dist, ax: a.x, ay: a.y, bx: b.x, by: b.y };
            }
          }
        }
      }

      if (!best) break;
      this.carveRoadPath(best.ax, best.ay, best.bx, best.by);
      components = this.getRoadComponents();
      guard++;
    }
  }

  // Guide Section 5 — Road generation with traffic-level modes
  buildRoads() {
    const trafficLevel = this.config.trafficLevel || 'balanced';

    if (this.config.roadStyle === 'grid') {
      const hSpine = Math.floor(this.height / 2); 
      const vSpine = Math.floor(this.width / 2);
      
      // Always: center cross roads (Guide Section 5 — mandatory)
      for (let x = 0; x < this.width; x++) if (this.grid[hSpine][x] !== 'water' && !this.isLocked(x, hSpine)) this.grid[hSpine][x] = 'road';
      for (let y = 0; y < this.height; y++) if (this.grid[y][vSpine] !== 'water' && !this.isLocked(vSpine, y)) this.grid[y][vSpine] = 'road';

      // Balanced traffic: add quarter-line arteries (Guide Section 5)
      if (trafficLevel === 'balanced') {
        const q1Row = Math.floor(this.height / 4);
        const q3Row = Math.floor(this.height * 3 / 4);
        const q1Col = Math.floor(this.width / 4);
        const q3Col = Math.floor(this.width * 3 / 4);

        for (let x = 0; x < this.width; x++) {
          if (this.grid[q1Row][x] !== 'water' && !this.isLocked(x, q1Row)) this.grid[q1Row][x] = 'road';
          if (this.grid[q3Row][x] !== 'water' && !this.isLocked(x, q3Row)) this.grid[q3Row][x] = 'road';
        }
        for (let y = 0; y < this.height; y++) {
          if (this.grid[y][q1Col] !== 'water' && !this.isLocked(q1Col, y)) this.grid[y][q1Col] = 'road';
          if (this.grid[y][q3Col] !== 'water' && !this.isLocked(q3Col, y)) this.grid[y][q3Col] = 'road';
        }
      }
      
      // High traffic: grid roads every 4 cells — rows AND columns (Bug 1 fix)
      if (trafficLevel === 'high') {
        for (let i = 0; i < this.height; i += 4) {
          // Draw full horizontal row
          for (let x = 0; x < this.width; x++) {
            if (this.grid[i][x] !== 'water' && !this.isLocked(x, i)) this.grid[i][x] = 'road';
          }
        }
        for (let i = 0; i < this.width; i += 4) {
          // Draw full vertical column
          for (let y = 0; y < this.height; y++) {
            if (this.grid[y][i] !== 'water' && !this.isLocked(i, y)) this.grid[y][i] = 'road';
          }
        }
      }

      // High density also adds sub-arteries (existing behavior for backward compat)
      if (this.config.density === 'high' && trafficLevel !== 'high') {
         const hSpine2 = this.height - 2;
         const vSpine2 = Math.floor(this.width / 4);
         const vSpine3 = Math.floor((this.width / 4) * 3);

         for (let x = 0; x < this.width; x++) if (this.grid[hSpine2][x] !== 'water') this.grid[hSpine2][x] = 'road';
         for (let y = 0; y < this.height; y++) {
             if (this.grid[y][vSpine2] !== 'water') this.grid[y][vSpine2] = 'road';
             if (this.grid[y][vSpine3] !== 'water') this.grid[y][vSpine3] = 'road';
         }
      }

      // Low traffic: center cross + perimeter ring + minimal internals for walkable neighborhoods
      if (trafficLevel === 'low') {
        // Perimeter ring for connectivity
        for (let x = 0; x < this.width; x++) {
          if (this.grid[0][x] !== 'water') this.grid[0][x] = 'road';
          if (this.grid[this.height - 1][x] !== 'water') this.grid[this.height - 1][x] = 'road';
        }
        for (let y = 0; y < this.height; y++) {
          if (this.grid[y][0] !== 'water') this.grid[y][0] = 'road';
          if (this.grid[y][this.width - 1] !== 'water') this.grid[y][this.width - 1] = 'road';
        }
        // Only center spines, no quarter-lines for low traffic (walkable neighborhoods)
      }
    } else {
      // Organic: create meandering corridors instead of rigid loops.
      const cx = Math.floor(this.width / 2);
      const cy = Math.floor(this.height / 2);
      const verticalAmplitude = this.config.density === 'high' ? 2 : 1;
      const horizontalAmplitude = this.config.density === 'high' ? 2 : 1;

      for (let y = 0; y < this.height; y++) {
        const wave = Math.round(Math.sin((y + 1) * 0.9) * verticalAmplitude);
        const x = this.clamp(cx + wave, 1, this.width - 2);
        this.setTileIfNotWater(x, y, 'road');
        if (this.config.density === 'high' || trafficLevel === 'high') this.setTileIfNotWater(x + 1, y, 'road');
      }

      for (let x = 0; x < this.width; x++) {
        const wave = Math.round(Math.cos((x + 2) * 0.7) * horizontalAmplitude);
        const y = this.clamp(cy + wave, 1, this.height - 2);
        this.setTileIfNotWater(x, y, 'road');
      }

      if (this.config.density !== 'low' && trafficLevel !== 'low') {
        const branchBase = this.clamp(cy + 2, 1, this.height - 2);
        for (let x = 0; x < this.width; x++) {
          const y = this.clamp(branchBase + Math.round(Math.sin(x * 0.8)), 1, this.height - 2);
          this.setTileIfNotWater(x, y, 'road');
        }
      }

      // Balanced/high traffic organic: add another branch
      if (trafficLevel === 'balanced' || trafficLevel === 'high') {
        const branchBase2 = this.clamp(cy - 2, 1, this.height - 2);
        for (let x = 0; x < this.width; x++) {
          const y = this.clamp(branchBase2 + Math.round(Math.cos(x * 0.6)), 1, this.height - 2);
          this.setTileIfNotWater(x, y, 'road');
        }
      }
    }
  }

  addCoreZoning() {
    let coreCount = this.config.density === 'high' ? 14 : this.config.density === 'medium' ? 8 : 4;
    // Scale core count with grid size (base was designed for 12×8 = 96 cells)
    const areaRatio = (this.width * this.height) / 96;
    coreCount = Math.max(coreCount, Math.round(coreCount * Math.sqrt(areaRatio)));
    
    // If high_density, boost core count for more commercial/primary zones
    if (this.config.density === 'high') {
      coreCount = Math.round(coreCount * 1.4);
    }

    if (this.config.primaryZone === 'industrial') {
      this.addIndustrialCore(coreCount);
      return;
    }
    
    // Guide Section 4 — Residential: interior cells, not on perimeter
    // Attempt to cluster along intersections or geographic center
    const cx = Math.floor(this.width/2);
    const cy = Math.floor(this.height/2);
    
    for(let radius = 1; radius < Math.max(this.width, this.height) && coreCount > 0; radius++) {
      for(let y = cy-radius; y <= cy+radius && coreCount > 0; y++) {
        for(let x = cx-radius; x <= cx+radius && coreCount > 0; x++) {
          if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
            if (this.grid[y][x] === 'empty' && !this.isLocked(x, y)) {
               // Bug 3 fix: allow center-proximity as fallback so commercial cores
               // aren't starved on first pass when no primaryZone neighbours exist yet
               const centerDist = Math.abs(x - cx) + Math.abs(y - cy);
               const eligible =
                 this.isAdjacentTo(x, y, 'road') ||
                 this.isAdjacentTo(x, y, this.config.primaryZone) ||
                 centerDist <= 2;
               if (eligible) {
                 this.grid[y][x] = this.config.primaryZone;
                 coreCount--;
               }
            }
          }
        }
      }
    }
  }

  addIndustrialCore(coreCount) {
    // If eco mode is enabled, skip industrial zones entirely (eco cities avoid heavy industry)
    if (this.config.eco) return;

    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    const candidates = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'empty' || this.isLocked(x, y)) continue;

        const centerDist = Math.abs(x - cx) + Math.abs(y - cy);
        let score = 0;
        if (this.isEdge(x, y)) score += 4;
        if (this.isAdjacentTo(x, y, 'road')) score += 3;
        if (this.isAdjacentTo(x, y, 'water')) score += 3;
        if (centerDist >= 4) score += 1;
        if (this.isAdjacentTo(x, y, 'residential')) score -= 5;

        candidates.push({ x, y, score: score + Math.random() * 0.4 });
      }
    }

    candidates.sort((a, b) => b.score - a.score);

    for (const c of candidates) {
      if (coreCount <= 0) break;
      if (this.grid[c.y][c.x] !== 'empty') continue;
      this.grid[c.y][c.x] = 'industrial';
      coreCount--;
    }
  }

  addHospitalZone() {
    if (!this.config.hospitalZone) return;

    // Scale hospital cell count with grid size
    const baseCount = this.config.density === 'high' ? 4 : this.config.density === 'low' ? 2 : 3;
    const areaRatio = (this.width * this.height) / 96;
    const targetCells = Math.max(baseCount, Math.round(baseCount * Math.sqrt(areaRatio) * 0.6));
    const centerX = Math.floor(this.width / 2);
    const centerY = Math.floor(this.height / 2);
    const candidates = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'empty' || this.isLocked(x, y)) continue;

        // Guide Section 4 — Hospital: adjacent to main road, avoid deep interior
        const adjacentRoad = this.isAdjacentTo(x, y, 'road') ? 1 : 0;
        if (!adjacentRoad) continue;

        const adjacentResidential = this.isAdjacentTo(x, y, 'residential') ? 1 : 0;
        const adjacentIndustrial = this.isAdjacentTo(x, y, 'industrial') ? 1 : 0;
        const adjacentWater = this.isAdjacentTo(x, y, 'water') ? 1 : 0;
        if (adjacentIndustrial) continue;

        const centerDistance = Math.abs(x - centerX) + Math.abs(y - centerY);

        const score =
          adjacentRoad * 6 +
          adjacentResidential * 4 -
          adjacentIndustrial * 8 -
          adjacentWater * 3 -
          centerDistance * 0.35 +
          Math.random() * 0.25;

        candidates.push({ x, y, score });
      }
    }

    if (!candidates.length) {
      return;
    }

    candidates.sort((a, b) => b.score - a.score);

    const anchor = candidates[0];
    const placements = [{ x: anchor.x, y: anchor.y }];
    const offsets = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];

    for (const [dx, dy] of offsets) {
      if (placements.length >= targetCells) break;

      const x = anchor.x + dx;
      const y = anchor.y + dy;
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
      if (this.grid[y][x] !== 'empty') continue;
      if (this.isAdjacentTo(x, y, 'industrial')) continue;

      placements.push({ x, y });
    }

    for (const placement of placements) {
      this.grid[placement.y][placement.x] = 'hospital';
    }
  }

  // Guide Section 4 — School: near residential, away from commercial/hospital
  addSchoolZone() {
    if (!this.config.schoolZone) return;

    // Scale school count with grid size
    const baseCount = this.config.density === 'high' ? 3 : this.config.density === 'low' ? 1 : 2;
    const areaRatio = (this.width * this.height) / 96;
    const targetCells = Math.max(baseCount, Math.round(baseCount * Math.sqrt(areaRatio) * 0.5));

    const candidates = [];
    let attempts = 0;

    for (let y = 0; y < this.height && attempts < 1000; y++) {
      for (let x = 0; x < this.width && attempts < 1000; x++) {
        attempts++;
        if (this.grid[y][x] !== 'empty' || this.isLocked(x, y)) continue;

        const nearResidential = this.isAdjacentTo(x, y, 'residential') ? 1 : 0;
        const nearPark = this.isAdjacentTo(x, y, 'park') ? 1 : 0;
        const nearCommercial = this.isAdjacentTo(x, y, 'commercial') ? 1 : 0;
        const nearHospital = this.isAdjacentTo(x, y, 'hospital') ? 1 : 0;
        const nearRoad = this.isAdjacentTo(x, y, 'road') ? 1 : 0;
        const nearIndustrial = this.isAdjacentTo(x, y, 'industrial') ? 1 : 0;

        // Guide Section 4 — School placement: near residential, park; avoid hospital, roads (heavy), commercial
        const score =
          nearResidential * 6 +
          nearPark * 4 +
          nearRoad * 2 -
          nearCommercial * 3 -
          nearHospital * 4 -
          nearIndustrial * 6 +
          Math.random() * 0.3;

        if (nearIndustrial) continue; // Hard avoid industrial

        candidates.push({ x, y, score });
      }
    }

    if (!candidates.length) return;

    candidates.sort((a, b) => b.score - a.score);

    let placed = 0;
    for (const c of candidates) {
      if (placed >= targetCells) break;
      if (this.grid[c.y][c.x] !== 'empty') continue;
      this.grid[c.y][c.x] = 'school';
      placed++;
    }
  }

  addParks() {
    if (this.config.forestDensity === 'high') {
      this.addDenseForests();
      return;
    }

    // Scale park count with grid size
    const areaRatio = (this.width * this.height) / 96;
    const scaleMultiplier = Math.sqrt(areaRatio);

    let parkCount = this.config.parkStyle === 'central' ? Math.round(6 * scaleMultiplier) 
      : this.config.parkStyle === 'bordering' ? Math.round(12 * scaleMultiplier) 
      : this.config.parkStyle === 'scattered' ? Math.round(8 * scaleMultiplier) 
      : 0;

    // Guide Section 10 — If eco=true, strongly boost park count
    if (this.config.eco) {
      // Eco mode targets 12% of the map as parks for healthy, sustainable cities
      const basePct = 0.12;
      const densityFactor = this.config.density === 'high' ? 1.1 : this.config.density === 'low' ? 0.9 : 1.0;
      const minEcoParks = Math.round(this.width * this.height * basePct * densityFactor);
      // Also keep a reasonable absolute floor relative to small grids
      const floorByScale = Math.round(10 * scaleMultiplier);
      parkCount = Math.max(parkCount, minEcoParks, floorByScale);
    }
    
    if (this.config.parkStyle === 'central') {
      const cx = Math.floor(this.width / 3), cy = Math.floor(this.height/2);
      for(let y=cy-1; y<=cy+1; y++) {
        for(let x=cx-1; x<=cx+1; x++) {
          if (this.grid[y]?.[x] === 'empty' && !this.isLocked(x, y) && parkCount > 0) { this.grid[y][x] = 'park'; parkCount--; }
        }
      }
    } else if (this.config.parkStyle === 'bordering') {
      // Line the outside edges
      for(let x=0; x<this.width && parkCount > 0; x++) {
        if(this.grid[0][x] === 'empty') { this.grid[0][x] = 'park'; parkCount--; }
        if(this.grid[this.height-1][x] === 'empty') { this.grid[this.height-1][x] = 'park'; parkCount--; }
      }
    } else if (this.config.parkStyle === 'scattered') {
      // Guide Section 4 — Park: adjacent to residential clusters
      // Bug 5 fix: raise first-pass chance from 0.35 → 0.65 so small grids
      // reliably reach their target park count (prevents chronic low green coverage)
      // If eco mode is enabled, increase placement probabilities
      const firstPassProb = this.config.eco ? 0.95 : 0.65;
      const secondPassProb = this.config.eco ? 0.8 : 0.4;
      const thirdPassProb = this.config.eco ? 0.65 : 0.25;

      for(let y=0; y<this.height && parkCount > 0; y++) {
        for(let x=0; x<this.width && parkCount > 0; x++) {
          if (this.grid[y][x] === 'empty' && !this.isLocked(x, y) && this.isAdjacentTo(x, y, 'residential') && Math.random() < firstPassProb) {
            this.grid[y][x] = 'park';
            parkCount--;
          }
        }
      }
      // Second pass: scatter remaining parks near roads
      for(let y=0; y<this.height && parkCount > 0; y++) {
        for(let x=0; x<this.width && parkCount > 0; x++) {
          if (this.grid[y][x] === 'empty' && !this.isLocked(x, y) && this.isAdjacentTo(x, y, 'road') && Math.random() < secondPassProb) {
            this.grid[y][x] = 'park';
            parkCount--;
          }
        }
      }
      // Third pass: fill quota from any remaining empty cell
      for(let y=0; y<this.height && parkCount > 0; y++) {
        for(let x=0; x<this.width && parkCount > 0; x++) {
          if (this.grid[y][x] === 'empty' && !this.isLocked(x, y) && Math.random() < thirdPassProb) {
            this.grid[y][x] = 'park';
            parkCount--;
          }
        }
      }

      // Fourth pass (eco only): aggressively convert some low-impact empty cells
      if (this.config.eco && parkCount > 0) {
        for(let y=0; y<this.height && parkCount > 0; y++) {
          for(let x=0; x<this.width && parkCount > 0; x++) {
            if (this.grid[y][x] === 'empty' && !this.isLocked(x, y) && (this.isAdjacentTo(x, y, 'residential') || this.isAdjacentTo(x,y,'road')) && Math.random() < 0.75) {
              this.grid[y][x] = 'park';
              parkCount--;
            }
          }
        }
      }

      // Fifth pass (eco only): convert low-priority roads at edges or dead-ends to parks
      if (this.config.eco && parkCount > 0) {
        for(let y=0; y<this.height && parkCount > 0; y++) {
          for(let x=0; x<this.width && parkCount > 0; x++) {
            if (this.grid[y][x] === 'road' && !this.isLocked(x, y)) {
              // Only convert roads that aren't critical connectors (single neighbor or edge)
              const roadNeighbors = this.getCardinalNeighbors(x, y).filter(n => n.type === 'road').length;
              if (roadNeighbors <= 1 && Math.random() < 0.4) {
                this.grid[y][x] = 'park';
                parkCount--;
              }
            }
          }
        }
      }
    }
  }

  addDenseForests() {
    const targetParks = Math.floor(this.width * this.height * 0.38);
    let parksPlaced = 0;
    let attempts = 0;

    while (parksPlaced < targetParks && attempts < 3000) {
      attempts++;
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);

      if (this.grid[y][x] !== 'empty' || this.isLocked(x, y)) continue;

      const nearForest = this.isAdjacentTo(x, y, 'park');
      const nearRoad = this.isAdjacentTo(x, y, 'road');
      const placementChance = nearForest ? 0.8 : nearRoad ? 0.35 : 0.55;

      if (Math.random() < placementChance) {
        this.grid[y][x] = 'park';
        parksPlaced++;
      }
    }
  }

  fillResidential() {
    // Bug 4 fix: when primaryZone is commercial, fill empty cells with commercial
    // so commercial districts actually dominate rather than getting buried in residential.
    // Residential is always used as a secondary fill for remaining empty space.
    const primaryFillType = this.config.primaryZone === 'commercial' ? 'commercial' : 'residential';

    // High density = fill 100%, low density = fill 40%
    let fillRate = this.config.density === 'high' ? 1.0 : this.config.density === 'medium' ? 0.8 : 0.4;
    if (this.config.forestDensity === 'high') fillRate *= 0.85;
    // Eco mode reduces fill rate to preserve more empty green space for later conversion to parks
    if (this.config.eco) fillRate *= 0.75;
    // Commercial fill gets a reduced rate so some variety remains
    const primaryFillRate = primaryFillType === 'commercial' ? fillRate * 0.55 : fillRate;

    let residentialCount = 0;

    // First pass: fill with primaryFillType near roads
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'empty' || this.isLocked(x, y)) {
          if (this.grid[y][x] === 'residential') residentialCount++;
          continue;
        }
        const nearRoad = this.isAdjacentTo(x, y, 'road');
        const nearIndustrial = this.isAdjacentTo(x, y, 'industrial');
        let chance = nearRoad ? primaryFillRate : primaryFillRate * 0.3;
        if (nearIndustrial) chance *= 0.08;
        if (Math.random() < chance) {
          this.grid[y][x] = primaryFillType;
          if (primaryFillType === 'residential') residentialCount++;
        }
      }
    }

    // Second pass: fill remaining empty with residential regardless of primaryZone
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'empty' || this.isLocked(x, y)) continue;
        const nearResidential = this.isAdjacentTo(x, y, 'residential');
        const nearIndustrial = this.isAdjacentTo(x, y, 'industrial');
        let chance = nearResidential ? fillRate * 0.6 : fillRate * 0.12;
        if (nearIndustrial) chance *= 0.08;
        if (Math.random() < chance) {
          this.grid[y][x] = 'residential';
          residentialCount++;
        }
      }
    }

    this.ensureMinimumResidential(residentialCount);
  }

  getMinimumResidential() {
    // Scale minimum residential with grid area
    const areaRatio = (this.width * this.height) / 96;
    const scaleFactor = Math.sqrt(areaRatio);
    if (this.config.forestDensity === 'high') {
      return Math.round((this.config.density === 'low' ? 8 : this.config.density === 'medium' ? 14 : 20) * scaleFactor);
    }
    return Math.round((this.config.density === 'low' ? 12 : this.config.density === 'medium' ? 20 : 30) * scaleFactor);
  }

  ensureMinimumResidential(currentCount = 0) {
    let residentialCount = currentCount;
    if (residentialCount === 0) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          if (this.grid[y][x] === 'residential') residentialCount++;
        }
      }
    }

    // Keep a minimum amount of housing so low-density maps still feel inhabited.
    const minResidential = this.getMinimumResidential();

    if (residentialCount >= minResidential) return;

    for (let y = 0; y < this.height && residentialCount < minResidential; y++) {
      for (let x = 0; x < this.width && residentialCount < minResidential; x++) {
        if (
          this.grid[y][x] === 'empty' &&
          !this.isLocked(x, y) &&
          this.isAdjacentTo(x, y, 'road') &&
          !this.isAdjacentTo(x, y, 'industrial')
        ) {
          this.grid[y][x] = 'residential';
          residentialCount++;
        }
      }
    }

    for (let y = 0; y < this.height && residentialCount < minResidential; y++) {
      for (let x = 0; x < this.width && residentialCount < minResidential; x++) {
        if (this.grid[y][x] === 'empty' && !this.isLocked(x, y) && !this.isAdjacentTo(x, y, 'industrial')) {
          this.grid[y][x] = 'residential';
          residentialCount++;
        }
      }
    }

    for (let y = 0; y < this.height && residentialCount < minResidential; y++) {
      for (let x = 0; x < this.width && residentialCount < minResidential; x++) {
        if (this.grid[y][x] === 'empty' && !this.isLocked(x, y)) {
          this.grid[y][x] = 'residential';
          residentialCount++;
        }
      }
    }
  }

  findNearestRoad(x, y) {
    let best = null;
    for (let yy = 0; yy < this.height; yy++) {
      for (let xx = 0; xx < this.width; xx++) {
        if (this.grid[yy][xx] !== 'road') continue;
        const dist = Math.abs(xx - x) + Math.abs(yy - y);
        if (!best || dist < best.dist) best = { x: xx, y: yy, dist };
      }
    }
    return best;
  }

  enforceZoningRules() {
    const conversions = [];

    // Keep a small buffer between industry and housing.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'residential' || this.isLocked(x, y)) continue;
        if (!this.isAdjacentTo(x, y, 'industrial')) continue;

        const replacement = 'park';
        conversions.push({ x, y, replacement });
      }
    }

    for (const c of conversions) {
      if (this.grid[c.y][c.x] === 'water' || this.isLocked(c.x, c.y)) continue;
      this.grid[c.y][c.x] = c.replacement;
    }

    // Keep hospital zones connected to roads and away from industry pressure.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'hospital' || this.isLocked(x, y)) continue;

        if (!this.isAdjacentTo(x, y, 'road')) {
          const nearestRoad = this.findNearestRoad(x, y);
          if (nearestRoad) {
            this.carveRoadPath(x, y, nearestRoad.x, nearestRoad.y);
          }
        }

        if (this.isAdjacentTo(x, y, 'industrial')) {
          this.grid[y][x] = 'park';
        }
      }
    }

    // Keep school zones connected to roads and away from industry.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'school' || this.isLocked(x, y)) continue;

        if (this.isAdjacentTo(x, y, 'industrial')) {
          this.grid[y][x] = 'park';
        }
      }
    }

    // Ensure industrial zones always have a road path.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] !== 'industrial' || this.isLocked(x, y)) continue;
        if (this.isAdjacentTo(x, y, 'road')) continue;

        const nearestRoad = this.findNearestRoad(x, y);
        if (nearestRoad) {
          this.carveRoadPath(x, y, nearestRoad.x, nearestRoad.y);
        }
      }
    }

    this.ensureRoadConnectivity();
    this.ensureMinimumResidential();
  }

  isAdjacentTo(x, y, type) {
    const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
    for (let [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (this.grid[ny][nx] === type) return true;
      }
    }
    return false;
  }

  /**
   * 🔥 TECH DEPTH: Ensure all zones reachable via roads using BFS graph traversal.
   * This is a production-grade safety pass to ensure no "island" zones exist.
   */
  ensureGlobalConnectivity() {
    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const queue = [];

    // Find all road seeds
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 'road') {
          queue.push({ x, y });
          visited[y][x] = true;
        }
      }
    }

    // BFS to find all reachable areas from roads
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (queue.length > 0) {
      const { x, y } = queue.shift();
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && !visited[ny][nx]) {
          // In our model, zones are "reachable" if they are adjacent to a road or a road-connected tile
          if (this.grid[ny][nx] !== 'water' && this.grid[ny][nx] !== 'empty') {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    // Connect any "unreachable" buildings
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const type = this.grid[y][x];
        if (!visited[y][x] && type !== 'empty' && type !== 'water' && type !== 'road') {
          const nearestRoad = this.findNearestRoad(x, y);
          if (nearestRoad) {
            this.carveRoadPath(x, y, nearestRoad.x, nearestRoad.y);
            // After carving, this cluster is now connected (simple heuristic)
            visited[y][x] = true;
          }
        }
      }
    }
  }
}
