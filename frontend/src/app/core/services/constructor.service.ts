import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constructor, ConstructorStanding } from '../models/constructor.model';
import { RaceResult } from '../models/race-result.model';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class ConstructorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_URL)}/v1/constructors`;

  getAll(): Observable<Constructor[]> {
    return this.http.get<Constructor[]>(this.base);
  }

  getById(id: number): Observable<Constructor> {
    return this.http.get<Constructor>(`${this.base}/${id}`);
  }

  getResults(id: number, season: number): Observable<RaceResult[]> {
    return this.http.get<RaceResult[]>(`${this.base}/${id}/results`, {
      params: new HttpParams().set('season', season),
    });
  }

  getStandings(season: number): Observable<ConstructorStanding[]> {
    return this.http.get<ConstructorStanding[]>(`${this.base}/standings`, {
      params: new HttpParams().set('season', season),
    });
  }
}
