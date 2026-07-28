import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Race } from '../models/race.model';
import { RaceResult } from '../models/race-result.model';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class RaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly base = `${this.apiUrl}/v1/races`;

  getBySeason(year: number): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.base}/season/${year}`);
  }

  getUpcoming(): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.base}/upcoming`);
  }

  getSeasonResults(year: number): Observable<RaceResult[]> {
    return this.http.get<RaceResult[]>(`${this.base}/season/${year}/results`);
  }

  getBySeasonAndRound(year: number, round: number): Observable<Race> {
    return this.http.get<Race>(`${this.base}/season/${year}/round/${round}`);
  }

  getById(id: number): Observable<Race> {
    return this.http.get<Race>(`${this.base}/${id}`);
  }

  getResults(id: number): Observable<RaceResult[]> {
    return this.http.get<RaceResult[]>(`${this.base}/${id}/results`);
  }

  getResultsBySeasonAndRound(year: number, round: number): Observable<RaceResult[]> {
    return this.http.get<RaceResult[]>(`${this.base}/season/${year}/round/${round}/results`);
  }
}
