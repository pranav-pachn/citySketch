import axios from 'axios';

/**
 * OSM Service to fetch data from Overpass API
 */
export class OSMService {
  constructor() {
    this.overpassUrl = 'https://overpass-api.de/api/interpreter';
  }

  /**
   * Fetch map data for a given bounding box
   * @param {Array} bbox - [minlat, minlon, maxlat, maxlon]
   * @returns {Promise<Object>} - OSM data in JSON format
   */
  async fetchMapData(bbox) {
    const [minLat, minLon, maxLat, maxLon] = bbox;
    const bboxStr = `${minLat},${minLon},${maxLat},${maxLon}`;

    const query = `
      [out:json][timeout:25];
      (
        // Fetch roads
        way["highway"](${bboxStr});
        // Fetch water
        way["natural"="water"](${bboxStr});
        relation["natural"="water"](${bboxStr});
        way["waterway"](${bboxStr});
        // Fetch buildings
        way["building"](${bboxStr});
        relation["building"](${bboxStr});
        // Fetch parks and green areas
        way["leisure"="park"](${bboxStr});
        way["landuse"="grass"](${bboxStr});
        way["landuse"="forest"](${bboxStr});
        way["landuse"="meadow"](${bboxStr});
        way["natural"="wood"](${bboxStr});
        // Fetch landuse
        way["landuse"](${bboxStr});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await axios.post(this.overpassUrl, `data=${encodeURIComponent(query)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return this.processOSMData(response.data);
    } catch (error) {
      console.error('Overpass API error:', error.message);
      if (error.response && error.response.status === 429) {
        throw new Error('OSM API rate limit exceeded. Please try again later.');
      }
      throw new Error('Failed to fetch OSM data');
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
    const relations = [];

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
      bbox: data.osm3s?.copyright ? data.osm3s.copyright : null,
      ways,
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
