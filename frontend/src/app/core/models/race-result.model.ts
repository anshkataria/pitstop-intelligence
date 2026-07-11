export interface RaceResult {
  id: number;
  raceId: number;
  seasonYear: number;
  round: number;
  driverId: number;
  driverRef: string;
  driverName: string;
  constructorId: number;
  constructorRef: string;
  constructorName: string;
  gridPosition: number | null;
  finishPosition: number | null;
  points: number;
  status: string;
}

export interface DriverSeasonStats {
  driverId: number;
  seasonYear: number;
  racesEntered: number;
  points: number;
  wins: number;
  podiums: number;
  averageFinish: number | null;
  polePositions: number;
  dnfs: number;
}
