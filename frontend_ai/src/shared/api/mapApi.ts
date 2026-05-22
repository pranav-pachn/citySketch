import { apiClient, type LocationResult } from './apiClient';

export const mapApi = {
  search: async (query: string): Promise<LocationResult[]> => {
    return apiClient.searchLocations(query);
  },

  generateFromMap: async (
    bbox: [number, number, number, number],
    locationName: string,
    gridSize: number = 20,
    prompt?: string,
  ) => {
    return apiClient.generateFromMap(bbox, locationName, gridSize, prompt);
  },
};
