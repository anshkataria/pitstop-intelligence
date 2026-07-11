import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PredictionContext, PredictionEntry, PredictionResponse } from '../models/prediction.model';
import { API_URL, ML_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);
  private readonly mlUrl = inject(ML_URL);
  private readonly base = `${this.mlUrl}/v1`;
  private readonly apiUrl = inject(API_URL);

  getContext(season: number, round: number): Observable<PredictionContext> {
    return this.http.get<PredictionContext>(`${this.apiUrl}/v1/predictions/context`, {
      params: { season, round },
    });
  }

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
    return this.http.post<any>(`${this.base}/predict`, body).pipe(
      map((response) => ({
        predictionRunId: response.prediction_run_id,
        modelLoaded: response.model_loaded,
        modelVersion: response.model_version,
        predictions: response.predictions.map((result: any) => ({
          driverRef: result.driver_ref,
          constructorRef: result.constructor_ref,
          gridPosition: result.grid_position,
          predictedPosition: result.predicted_position,
          predictedPositionRounded: result.predicted_position_rounded,
          confidenceRangeLow: result.confidence_range_low,
          confidenceRangeHigh: result.confidence_range_high,
        })),
      })),
    );
  }

  health(): Observable<{ status: string; model_loaded: boolean }> {
    return this.http.get<{ status: string; model_loaded: boolean }>(`${this.base}/health`);
  }
}
