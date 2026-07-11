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
  predictionRunId: number;
  modelVersion: string;
}

export interface PredictionContextEntry {
  driverId: number;
  driverRef: string;
  driverName: string;
  driverNationality: string;
  constructorId: number;
  constructorRef: string;
  constructorName: string;
  constructorNationality: string;
  gridPosition: number;
}

export interface PredictionContext {
  race: import('./race.model').Race;
  entries: PredictionContextEntry[];
}
