import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent) },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'drivers', loadComponent: () => import('./features/drivers/driver-list/driver-list.component').then((m) => m.DriverListComponent) },
  { path: 'drivers/:id', loadComponent: () => import('./features/drivers/driver-profile/driver-profile.component').then((m) => m.DriverProfileComponent) },
  { path: 'predictions', loadComponent: () => import('./features/predictions/predictions.component').then((m) => m.PredictionsComponent) },
  { path: 'race-analysis', loadComponent: () => import('./features/race-analysis/race-analysis.component').then((m) => m.RaceAnalysisComponent) },
  { path: 'teams', redirectTo: 'dashboard' },
  { path: 'data', redirectTo: 'dashboard' },
  { path: 'reports', redirectTo: 'dashboard' },
  { path: '**', redirectTo: '' },
];
