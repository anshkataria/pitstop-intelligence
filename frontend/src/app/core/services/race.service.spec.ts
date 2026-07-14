import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../tokens/api.tokens';
import { RaceService } from './race.service';

describe('RaceService', () => {
  let service: RaceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
      ],
    });
    service = TestBed.inject(RaceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the complete result history for a season', () => {
    service.getSeasonResults(2024).subscribe((results) => expect(results).toEqual([]));

    http.expectOne('http://localhost:8080/api/v1/races/season/2024/results').flush([]);
  });
});
