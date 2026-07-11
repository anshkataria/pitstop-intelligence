import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DriversState } from '../../models/app-state.model';

export const selectDriversState = createFeatureSelector<DriversState>('drivers');

export const selectAllDrivers = createSelector(selectDriversState, (s) => s.drivers);
export const selectSelectedDriver = createSelector(selectDriversState, (s) => s.selectedDriver);
export const selectDriversLoading = createSelector(selectDriversState, (s) => s.loading);
export const selectDriversError = createSelector(selectDriversState, (s) => s.error);
export const selectDriversTotal = createSelector(selectDriversState, (s) => s.totalElements);
export const selectDriversPage = createSelector(selectDriversState, (s) => s.currentPage);
