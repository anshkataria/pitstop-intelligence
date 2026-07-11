import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Race } from '../models/race.model';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class RaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly base = `${this.apiUrl}/v1/drivers`;

  getBySeason(year: number): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.base}/season/${year}`);
  }

  getBySeasonAndRound(year: number, round: number): Observable<Race> {
    return this.http.get<Race>(`${this.base}/season/${year}/round/${round}`);
  }

  getById(id: number): Observable<Race> {
    return this.http.get<Race>(`${this.base}/${id}`);
  }
}
