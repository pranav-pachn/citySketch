interface ScoreMetric {
  value: number;
  display: string;
  formula: string;
  averageDistance?: number;
}

interface ScoreResult {
  totalCells: number;
  counts: Record<string, number>;
  metrics: {
    sustainability: ScoreMetric;
    traffic: ScoreMetric;
    walkability: ScoreMetric & { averageDistance: number };
    density: ScoreMetric;
    liveability: ScoreMetric;
  };
}

export function calcSustainability(grid: any[][]): string;
export function calcTraffic(grid: any[][]): string;
export function calcWalkability(grid: any[][]): 'High' | 'Low';
export function calculateScores(grid: any[][]): ScoreResult;
