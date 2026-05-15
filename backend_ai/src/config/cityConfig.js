/**
 * @file cityConfig.js
 * @description Production-grade configuration system for urban generation parameters.
 * Centralizing these values allows for easy tuning of city characteristics.
 */

export const CONFIG = {
  gridSize: 20,
  parkWeight: 0.3,
  roadDensity: 0.2,
  connectivityThreshold: 1, // Max distance a zone can be from a road
  maxBFSIterations: 10000,
  weights: {
    residential: 0.4,
    commercial: 0.3,
    industrial: 0.2,
    park: 0.1
  }
};
