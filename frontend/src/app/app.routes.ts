import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'sign-in',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/sign-in/sign-in.component').then((m) => m.SignInComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'drivers',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/drivers/driver-list/driver-list.component').then(
        (m) => m.DriverListComponent,
      ),
  },
  {
    path: 'drivers/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/drivers/driver-profile/driver-profile.component').then(
        (m) => m.DriverProfileComponent,
      ),
  },
  {
    path: 'teams',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/teams/team-list.component').then((m) => m.TeamListComponent),
  },
  {
    path: 'predictions/history',
    canActivate: [authGuard],
    loadComponent: () => import('./features/predictions/prediction-history.component').then((m) => m.PredictionHistoryComponent),
  },
  {
    path: 'predictions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/predictions/predictions.component').then((m) => m.PredictionsComponent),
  },
  {
    path: 'race-analysis',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/race-analysis/race-analysis.component').then(
        (m) => m.RaceAnalysisComponent,
      ),
  },
  {
    path: 'races',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/races/race-list.component').then((m) => m.RaceListComponent),
  },
  {
    path: 'races/:year/:round',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/races/race-detail.component').then((m) => m.RaceDetailComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
