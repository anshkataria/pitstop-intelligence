import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../tokens/api.tokens';
import { LiveService } from './live.service';

describe('LiveService', () => {
  let service: LiveService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),{provide:API_URL,useValue:'http://localhost:8080/api'}]});
    service=TestBed.inject(LiveService);http=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>http.verify());

  it('loads timing through the authenticated Spring API',()=>{
    service.timing('9839').subscribe(rows=>expect(rows).toEqual([]));
    http.expectOne('http://localhost:8080/api/v1/live/sessions/9839/timing').flush([]);
  });

  it('requests a bounded telemetry snapshot',()=>{
    service.telemetry('9839',4).subscribe(points=>expect(points).toEqual([]));
    http.expectOne('http://localhost:8080/api/v1/live/sessions/9839/drivers/4/telemetry?limit=1500').flush([]);
  });
});
