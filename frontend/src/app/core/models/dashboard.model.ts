import { Race } from './race.model';
import { RaceResult } from './race-result.model';

export interface DashboardSummary {
  seasonYear: number;
  race: Race;
  classification: RaceResult[];
  driverCount: number;
  raceCount: number;
  resultCount: number;
}
