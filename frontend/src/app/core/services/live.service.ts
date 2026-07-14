import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from '../tokens/api.tokens';
import {
  LiveEvent,
  LiveIntelligence,
  LiveLap,
  LivePitStop,
  LiveSession,
  LiveStint,
  LiveTelemetryPoint,
  LiveTimingRow,
  LiveWeather,
  RaceControlMessage,
} from '../models/live.model';

@Injectable({ providedIn: 'root' })
export class LiveService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = inject(API_URL);
  private readonly base = `${this.apiUrl}/v1/live`;

  sessions(): Observable<LiveSession[]> { return this.http.get<LiveSession[]>(`${this.base}/sessions`); }
  timing(key: string): Observable<LiveTimingRow[]> { return this.http.get<LiveTimingRow[]>(`${this.base}/sessions/${key}/timing`); }
  weather(key: string): Observable<LiveWeather[]> { return this.http.get<LiveWeather[]>(`${this.base}/sessions/${key}/weather`); }
  raceControl(key: string): Observable<RaceControlMessage[]> { return this.http.get<RaceControlMessage[]>(`${this.base}/sessions/${key}/race-control`); }
  intelligence(key: string): Observable<LiveIntelligence[]> { return this.http.get<LiveIntelligence[]>(`${this.base}/sessions/${key}/intelligence`); }
  laps(key: string): Observable<LiveLap[]> { return this.http.get<LiveLap[]>(`${this.base}/sessions/${key}/laps`); }
  stints(key: string): Observable<LiveStint[]> { return this.http.get<LiveStint[]>(`${this.base}/sessions/${key}/stints`); }
  pitStops(key: string): Observable<LivePitStop[]> { return this.http.get<LivePitStop[]>(`${this.base}/sessions/${key}/pit-stops`); }
  telemetry(key: string, driver: number): Observable<LiveTelemetryPoint[]> {
    return this.http.get<LiveTelemetryPoint[]>(`${this.base}/sessions/${key}/drivers/${driver}/telemetry?limit=1500`);
  }

  async stream(key: string, signal: AbortSignal, receive: (event: LiveEvent) => void): Promise<void> {
    const response = await fetch(`${this.base}/sessions/${key}/stream`, {
      headers: { Authorization: `Bearer ${this.auth.accessToken() ?? ''}` }, signal,
    });
    if (!response.ok || !response.body) throw new Error(`Live stream returned HTTP ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replaceAll('\r\n', '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const block of events) {
        const data = block.split('\n').filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim()).join('');
        if (data) {
          try { receive(JSON.parse(data) as LiveEvent); }
          catch { /* Ignore one malformed provider event without dropping the stream. */ }
        }
      }
    }
  }
}
