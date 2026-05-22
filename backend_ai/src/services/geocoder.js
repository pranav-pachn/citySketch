import axios from 'axios';

/**
 * Geocoder service using Nominatim API (OpenStreetMap)
 */
export class Geocoder {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org/search';
  }

  /**
   * Search for a location by query string
   * @param {string} query - The search query (e.g., "Hyderabad")
   * @returns {Promise<Array>} - List of results with lat, lon, boundingbox, display_name
   */
  async search(query) {
    if (!query) return [];

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 5,
        },
        headers: {
          'User-Agent': 'CitySketch-AI-Urban-Design-Studio',
        },
      });

      return response.data.map((item) => ({
        id: item.place_id,
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        boundingBox: item.boundingbox.map(parseFloat), // [minlat, maxlat, minlon, maxlon]
        type: item.type,
        importance: item.importance,
      }));
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw new Error('Failed to fetch location data');
    }
  }

  /**
   * Reverse geocode coordinates to an address
   * @param {number} lat 
   * @param {number} lon 
   */
  async reverse(lat, lon) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon,
          format: 'json',
        },
        headers: {
          'User-Agent': 'CitySketch-AI-Urban-Design-Studio',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }
}

export const geocoder = new Geocoder();
