import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthSession, LoginCredentials } from '../models/auth.model';
import { API_URL } from '../tokens/api.tokens';

const SESSION_KEY = 'pitstop.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly sessionState = signal<AuthSession | null>(this.readSession());
  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.sessionState()?.accessToken));

  login(credentials: LoginCredentials, remember: boolean): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.apiUrl}/v1/auth/login`, credentials)
      .pipe(tap((session) => this.storeSession(session, remember)));
  }

  refresh(): Observable<AuthSession> {
    const current = this.sessionState();
    if (!current) throw new Error('No session is available to refresh');
    const remember = Boolean(localStorage.getItem(SESSION_KEY));
    return this.http.post<AuthSession>(`${this.apiUrl}/v1/auth/refresh`, { refreshToken: current.refreshToken })
      .pipe(tap((session) => this.storeSession(session, remember)));
  }

  logout(): void {
    const refreshToken = this.sessionState()?.refreshToken;
    this.clearSession();
    if (refreshToken) this.http.post<void>(`${this.apiUrl}/v1/auth/logout`, { refreshToken })
      .subscribe({ error: () => undefined });
  }

  accessToken(): string | null { return this.sessionState()?.accessToken ?? null; }

  clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.sessionState.set(null);
  }

  private storeSession(session: AuthSession, remember: boolean): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionState.set(session);
  }

  private readSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) as AuthSession : null;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}
