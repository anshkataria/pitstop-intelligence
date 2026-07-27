import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DriverStanding } from '../models/standing.model';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class StandingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_URL)}/v1/standings`;

  getDriverStandings(season: number): Observable<DriverStanding[]> {
    return this.http.get<DriverStanding[]>(`${this.base}/drivers`, {
      params: new HttpParams().set('season', season),
    });
  }
}
