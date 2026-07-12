import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes } from './app.routes';
import { driversReducer } from './core/store/drivers/drivers.reducer';
import { racesReducer } from './core/store/races/races.reducer';
import { DriversEffects } from './core/store/drivers/drivers.effects';
import { RacesEffects } from './core/store/races/races.effects';
import { API_URL, ML_URL } from './core/tokens/api.tokens';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore({
      drivers: driversReducer,
      races: racesReducer,
    }),
    provideEffects([DriversEffects, RacesEffects]),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
    { provide: API_URL, useValue: 'http://localhost:8080/api' },
    { provide: ML_URL, useValue: 'http://localhost:8000' },
  ],
};
