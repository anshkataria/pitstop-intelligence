import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from '../models/auth.model';
import { API_URL } from '../tokens/api.tokens';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const session: AuthSession = {
    accessToken: 'access', refreshToken: 'refresh', expiresIn: 900,
    user: { id: 1, email: 'engineer@pitstop.test', displayName: 'Race Engineer', role: 'USER' },
  };

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: API_URL, useValue: 'http://localhost:8080/api' },
    ] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores remembered login in local storage', () => {
    service.login({ email: 'engineer@pitstop.test', password: 'racepace123' }, true).subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush(session);
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('pitstop.auth.session')).toContain('Race Engineer');
    expect(sessionStorage.getItem('pitstop.auth.session')).toBeNull();
  });

  it('stores non-remembered login for the browser session only', () => {
    service.login({ email: 'engineer@pitstop.test', password: 'racepace123' }, false).subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush(session);
    expect(sessionStorage.getItem('pitstop.auth.session')).toContain('access');
    expect(localStorage.getItem('pitstop.auth.session')).toBeNull();
  });

  it('clears local state immediately and revokes refresh token on logout', () => {
    service.login({ email: 'engineer@pitstop.test', password: 'racepace123' }, false).subscribe();
    http.expectOne('http://localhost:8080/api/v1/auth/login').flush(session);
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    const request = http.expectOne('http://localhost:8080/api/v1/auth/logout');
    expect(request.request.body).toEqual({ refreshToken: 'refresh' });
    request.flush(null);
  });
});
