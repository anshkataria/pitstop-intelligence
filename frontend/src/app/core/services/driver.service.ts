import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Driver, PagedResponse } from '../models/driver.model';
import { API_URL } from '../tokens/api.tokens';

@Injectable({ providedIn: 'root' })
export class DriverService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly base = `${this.apiUrl}/v1/drivers`;

  getAll(page = 0, size = 20, search?: string): Observable<PagedResponse<Driver>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return this.http.get<PagedResponse<Driver>>(this.base, { params });
  }

  getById(id: number): Observable<Driver> {
    return this.http.get<Driver>(`${this.base}/${id}`);
  }

  getByRef(driverRef: string): Observable<Driver> {
    return this.http.get<Driver>(`${this.base}/ref/${driverRef}`);
  }
}
