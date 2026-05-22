/**
 * Geocoder service using Nominatim API (OpenStreetMap)
 */
export class Geocoder {
  constructor() {
    this.baseUrl = 'https://nominatim.openstreetmap.org/search';
    this.userAgent = 'CitySketch-AI-Urban-Design-Studio/1.0';
  }

  /**
   * Search for a location by query string
   * @param {string} query - The search query (e.g., "Hyderabad")
   * @returns {Promise<Array>} - List of results with lat, lon, boundingbox, display_name
   */
  async search(query) {
    if (!query) return [];

    try {
      const url = new URL(this.baseUrl)
      url.searchParams.set('q', query)
      url.searchParams.set('format', 'json')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('limit', '5')

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Geocoding request failed with HTTP ${response.status}`)
      }

      const data = await response.json()

      return (Array.isArray(data) ? data : []).map((item) => {
        const bounding = Array.isArray(item.boundingbox)
          ? item.boundingbox.map((value) => parseFloat(value))
          : null

        return {
          id: item.place_id,
          name: item.display_name,
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          boundingBox: bounding && bounding.length === 4
            ? [bounding[0], bounding[2], bounding[1], bounding[3]]
            : null,
          type: item.type,
          importance: item.importance,
        }
      })
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'Location search timed out'
        : error?.message || 'Failed to fetch location data'
      console.error('Geocoding error:', message)
      const geocodeError = new Error(message)
      geocodeError.statusCode = 503
      geocodeError.isOperational = true
      throw geocodeError
    }
  }

  /**
   * Reverse geocode coordinates to an address
   * @param {number} lat 
   * @param {number} lon 
   */
  async reverse(lat, lon) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse')
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lon))
      url.searchParams.set('format', 'json')

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
      })

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed with HTTP ${response.status}`)
      }

      return response.json();
    } catch (error) {
      console.error('Reverse geocoding error:', error.message)
      return null
    }
  }
}

export const geocoder = new Geocoder();
