import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { API_URL } from '../tokens/api.tokens';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const auth = { accessToken: () => 'jwt-token', session: () => null, clearSession: vi.fn() };
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: API_URL, useValue: 'http://localhost:8080/api' },
      { provide: AuthService, useValue: auth },
    ] });
    client = TestBed.inject(HttpClient); http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adds bearer token to Spring API requests', () => {
    client.get('http://localhost:8080/api/v1/seasons').subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/seasons');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush([]);
  });

  it('does not expose Spring token to the ML service', () => {
    client.get('http://localhost:8000/v1/health').subscribe();
    const request = http.expectOne('http://localhost:8000/v1/health');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ status: 'UP' });
  });
});
