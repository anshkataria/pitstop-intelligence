export interface PredictionEntry {
  driverRef: string;
  constructorRef: string;
  circuitName: string;
  driverNationality: string;
  constructorNationality: string;
  gridPosition: number;
  seasonYear: number;
  round: number;
}

export interface PredictionResult {
  driverRef: string;
  constructorRef: string;
  gridPosition: number;
  predictedPosition: number;
  predictedPositionRounded: number;
  confidenceRangeLow: number;
  confidenceRangeHigh: number;
}

export interface PredictionResponse {
  predictions: PredictionResult[];
  modelLoaded: boolean;
}
