import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('authentication guards', () => {
  const auth = { isAuthenticated: () => false };

  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter([]), { provide: AuthService, useValue: auth },
  ] }));

  it('redirects anonymous users to sign-in with their requested URL', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as RouterStateSnapshot));
    expect(TestBed.inject(Router).serializeUrl(result as never))
      .toBe('/sign-in?returnUrl=%2Fdashboard');
  });

  it('allows authenticated users through protected routes', () => {
    auth.isAuthenticated = () => true;
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as RouterStateSnapshot));
    expect(result).toBe(true);
  });

  it('keeps authenticated users away from the guest sign-in screen', () => {
    auth.isAuthenticated = () => true;
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));
    expect(TestBed.inject(Router).serializeUrl(result as never)).toBe('/dashboard');
  });
});
