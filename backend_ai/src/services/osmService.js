/**
 * OSM Service to fetch data from Overpass API
 */
export class OSMService {
  constructor() {
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    this.userAgent = 'CitySketch-AI-Urban-Design-Studio/1.0';
    this.cache = new Map();
    this.lastRequestAt = 0;
    this.maxCacheEntries = 128;
  }

  normalizeBoundingBox(bbox) {
    const [minLat, minLon, maxLat, maxLon] = bbox.map((value) => Number(value))
    return [minLat, minLon, maxLat, maxLon]
  }

  getCacheKey(bbox) {
    return this.normalizeBoundingBox(bbox).map((value) => value.toFixed(4)).join(',')
  }

  getCached(cacheKey) {
    const entry = this.cache.get(cacheKey)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(cacheKey)
      return null
    }

    this.cache.delete(cacheKey)
    this.cache.set(cacheKey, entry)
    return entry.value
  }

  setCached(cacheKey, value) {
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + (30 * 60 * 1000),
    })

    while (this.cache.size > this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey === undefined) break
      this.cache.delete(oldestKey)
    }
  }

  async throttleRequest() {
    const elapsed = Date.now() - this.lastRequestAt
    const waitMs = Math.max(0, 2000 - elapsed)
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
    this.lastRequestAt = Date.now()
  }

  buildQuery(bboxStr) {
    return `
      [out:json][timeout:25];
      (
        way["highway"](${bboxStr});
        way["natural"="water"](${bboxStr});
        relation["natural"="water"](${bboxStr});
        way["waterway"](${bboxStr});
        way["building"](${bboxStr});
        relation["building"](${bboxStr});
        way["leisure"="park"](${bboxStr});
        way["landuse"="grass"](${bboxStr});
        way["landuse"="forest"](${bboxStr});
        way["landuse"="meadow"](${bboxStr});
        way["natural"="wood"](${bboxStr});
        way["landuse"](${bboxStr});
      );
      out body;
      >;
      out skel qt;
    `
  }

  async postOverpass(query, attempt = 0) {
    await this.throttleRequest()

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    try {
      const response = await fetch(this.overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent,
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })

      const rawBody = await response.text()

      if (response.status === 429 && attempt < 2) {
        const backoffMs = attempt === 0 ? 2000 : 4000
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        return this.postOverpass(query, attempt + 1)
      }

      if (!response.ok) {
        const error = new Error(`Overpass request failed with HTTP ${response.status}`)
        error.statusCode = response.status
        error.rawBody = rawBody
        throw error
      }

      let parsed
      try {
        parsed = JSON.parse(rawBody)
      } catch (parseError) {
        const error = new Error('Malformed Overpass JSON')
        error.statusCode = 503
        error.rawBody = rawBody
        throw error
      }

      if (!parsed || !Array.isArray(parsed.elements)) {
        const error = new Error('Empty Overpass response')
        error.statusCode = 503
        error.rawBody = rawBody
        throw error
      }

      return parsed
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error('Overpass request timed out after 25 seconds')
        timeoutError.code = 'osm_unavailable'
        timeoutError.statusCode = 503
        throw timeoutError
      }

      if (error?.statusCode === 429 || (error?.statusCode >= 500 && error?.statusCode < 600)) {
        const unavailable = new Error('OSM data is temporarily unavailable')
        unavailable.code = 'osm_unavailable'
        unavailable.statusCode = 503
        unavailable.rawBody = error.rawBody
        throw unavailable
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Fetch map data for a given bounding box
   * @param {Array} bbox - [minlat, minlon, maxlat, maxlon]
   * @returns {Promise<Object>} - OSM data in JSON format
   */
  async fetchMapData(bbox) {
    const normalizedBbox = this.normalizeBoundingBox(bbox)
    const [minLat, minLon, maxLat, maxLon] = normalizedBbox
    const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`
    const cacheKey = this.getCacheKey(normalizedBbox)

    const cached = this.getCached(cacheKey)
    if (cached) {
      return cached
    }

    const query = this.buildQuery(bboxStr)

    try {
      const response = await this.postOverpass(query)
      const processed = this.processOSMData(response)
      this.setCached(cacheKey, processed)
      return processed
    } catch (error) {
      console.error('Overpass API error:', error.message)
      if (error.code === 'osm_unavailable') {
        const unavailable = new Error(error.message || 'OSM data unavailable')
        unavailable.code = 'osm_unavailable'
        unavailable.statusCode = 503
        unavailable.rawBody = error.rawBody
        throw unavailable
      }

      if (error.statusCode === 400) {
        throw error
      }

      const unavailable = new Error('OSM data unavailable')
      unavailable.code = 'osm_unavailable'
      unavailable.statusCode = 503
      unavailable.rawBody = error.rawBody
      throw unavailable
    }
  }

  /**
   * Process raw OSM JSON into a more usable format for the rasterizer
   * @param {Object} data - Raw JSON from Overpass
   */
  processOSMData(data) {
    const nodes = new Map();
    const elements = data.elements || [];

    // First pass: collect all nodes
    elements.filter(e => e.type === 'node').forEach(node => {
      nodes.set(node.id, { lat: node.lat, lon: node.lon });
    });

    const ways = [];

    // Second pass: process ways and relations
    elements.forEach(element => {
      if (element.type === 'way') {
        const coords = element.nodes.map(nodeId => nodes.get(nodeId)).filter(Boolean);
        if (coords.length > 0) {
          ways.push({
            id: element.id,
            tags: element.tags || {},
            coordinates: coords,
            type: this.classifyElement(element.tags || {}),
          });
        }
      }
      // Note: Relations are more complex, for MVP we focus on ways
    });

    return {
      nodes,
      ways,
      meta: {
        timestamp: data.osm3s?.timestamp_osm_base || null,
        copyright: data.osm3s?.copyright || null,
      },
    };
  }

  /**
   * Classify an OSM element into one of our internal types
   * @param {Object} tags 
   */
  classifyElement(tags) {
    if (tags.highway) return 'road';
    if (tags.building) return 'building';
    if (tags.natural === 'water' || tags.waterway || tags.water) return 'water';
    if (tags.leisure === 'park' || tags.landuse === 'grass' || tags.landuse === 'forest' || tags.landuse === 'meadow' || tags.natural === 'wood') return 'park';
    
    if (tags.landuse === 'commercial' || tags.landuse === 'retail') return 'commercial';
    if (tags.landuse === 'residential') return 'residential';
    if (tags.landuse === 'industrial') return 'industrial';

    return 'other';
  }
}

export const osmService = new OSMService();
