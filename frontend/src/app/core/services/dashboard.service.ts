import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardSummary } from '../models/dashboard.model';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_URL)}/v1/dashboard`;

  getSummary(season: number, round?: number): Observable<DashboardSummary> {
    let params = new HttpParams().set('season', season);
    if (round != null) params = params.set('round', round);
    return this.http.get<DashboardSummary>(this.base, { params });
  }
}
