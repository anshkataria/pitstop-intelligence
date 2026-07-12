import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  getAll(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/v1/seasons`);
  }
}
