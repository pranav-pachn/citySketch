import { apiClient } from './apiClient';

export interface LocationResult {
  id: number;
  name: string;
  lat: number;
  lon: number;
  boundingBox: [number, number, number, number];
  type: string;
}

export const mapApi = {
  search: async (query: string): Promise<LocationResult[]> => {
    const response = await apiClient.get<LocationResult[]>(`/map/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  generateFromMap: async (bbox: [number, number, number, number], locationName: string, gridSize: number = 20) => {
    const response = await apiClient.post('/map/generate-from-map', {
      bbox,
      locationName,
      gridSize,
    });
    return response.data;
  },
};
