import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../tokens/api.tokens';
import { PredictionService } from './prediction.service';

describe('PredictionService', () => {
  let service: PredictionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: 'http://localhost:8080/api' },
      ],
    });
    service = TestBed.inject(PredictionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads prediction evaluation for a stored run', () => {
    const evaluation = {
      predictionRunId: 42,
      status: 'COMPLETE' as const,
      predictionCount: 2,
      evaluatedCount: 2,
      meanAbsoluteError: 1.2,
      rootMeanSquaredError: 1.4,
      exactMatchRate: 50,
      confidenceCoverage: 100,
      results: [],
    };

    service.getEvaluation(42).subscribe((result) => expect(result).toEqual(evaluation));

    http.expectOne('http://localhost:8080/api/v1/predictions/history/42/evaluation')
      .flush(evaluation);
  });
});
