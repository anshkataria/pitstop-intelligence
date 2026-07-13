import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { driversReducer } from './core/store/drivers/drivers.reducer';
import { racesReducer } from './core/store/races/races.reducer';
import { DriversEffects } from './core/store/drivers/drivers.effects';
import { RacesEffects } from './core/store/races/races.effects';
import { API_URL } from './core/tokens/api.tokens';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [App],
  imports: [BrowserModule, AppRoutingModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore({ drivers: driversReducer, races: racesReducer }),
    provideEffects([DriversEffects, RacesEffects]),
    { provide: API_URL, useValue: environment.apiUrl },
  ],
  bootstrap: [App],
})
export class AppModule {}
