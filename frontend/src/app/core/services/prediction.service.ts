import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PredictionEntry, PredictionResponse } from '../models/prediction.model';
import { API_URL, ML_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);
  private readonly mlUrl = inject(ML_URL);
  private readonly base = `${this.mlUrl}/v1/drivers`;

  predict(entries: PredictionEntry[]): Observable<PredictionResponse> {
    const body = {
      entries: entries.map((e) => ({
        driver_ref: e.driverRef,
        constructor_ref: e.constructorRef,
        circuit_name: e.circuitName,
        driver_nationality: e.driverNationality,
        constructor_nationality: e.constructorNationality,
        grid_position: e.gridPosition,
        season_year: e.seasonYear,
        round: e.round,
      })),
    };
    return this.http.post<PredictionResponse>(`${this.base}/predict`, body);
  }

  health(): Observable<{ status: string; model_loaded: boolean }> {
    return this.http.get<{ status: string; model_loaded: boolean }>(`${this.base}/health`);
  }
}
