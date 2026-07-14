export interface LiveSession {
  sessionKey: string;
  provider: string;
  year: number;
  countryName: string | null;
  circuitName: string | null;
  sessionName: string;
  sessionType: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  lastUpdatedAt: string;
}

export interface LiveTimingRow {
  driverNumber: number;
  driverCode: string | null;
  fullName: string | null;
  teamName: string | null;
  teamColour: string | null;
  position: number | null;
  intervalToLeader: string | null;
  gapToLeader: string | null;
  lapNumber: number;
}

export interface LiveTelemetryPoint {
  capturedAt: string;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  gear: number | null;
  rpm: number | null;
  drs: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
}

export interface LiveLap {
  driverNumber: number; lapNumber: number; startedAt: string | null;
  lapDuration: number | null; sector1Duration: number | null;
  sector2Duration: number | null; sector3Duration: number | null;
  speedTrap: number | null; pitOutLap: boolean | null;
}

export interface LiveStint {
  driverNumber: number; stintNumber: number; lapStart: number | null; lapEnd: number | null;
  compound: string | null; tyreAgeAtStart: number | null;
}

export interface LivePitStop {
  driverNumber: number; lapNumber: number; stoppedAt: string | null;
  stopDuration: number | null; laneDuration: number | null;
}

export interface LiveWeather {
  capturedAt: string;
  airTemperature: number | null;
  trackTemperature: number | null;
  humidity: number | null;
  pressure: number | null;
  rainfall: boolean;
  windDirection: number | null;
  windSpeed: number | null;
}

export interface RaceControlMessage {
  occurredAt: string;
  category: string | null;
  flag: string | null;
  lapNumber: number | null;
  message: string;
}

export interface LiveIntelligence {
  driverNumber: number;
  modelType: 'PIT_WINDOW' | 'TYRE_DEGRADATION' | 'SAFETY_CAR' | 'STRATEGY' | 'DNF';
  modelVersion: string;
  generatedAt: string;
  confidence: number;
  output: Record<string, string | number | boolean>;
}

export interface LiveEvent {
  event: string;
  sessionKey?: string;
  data?: unknown[];
}
