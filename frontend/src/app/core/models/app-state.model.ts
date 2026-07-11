import { Driver } from './driver.model';
import { Race } from './race.model';
import { PredictionResult } from './prediction.model';

export interface DriversState {
  drivers: Driver[];
  selectedDriver: Driver | null;
  loading: boolean;
  error: string | null;
  totalElements: number;
  currentPage: number;
}

export interface RacesState {
  races: Race[];
  selectedRace: Race | null;
  loading: boolean;
  error: string | null;
  selectedSeason: number;
}

export interface PredictionsState {
  results: PredictionResult[];
  loading: boolean;
  error: string | null;
  modelLoaded: boolean;
}

export interface AppState {
  drivers: DriversState;
  races: RacesState;
  predictions: PredictionsState;
}
