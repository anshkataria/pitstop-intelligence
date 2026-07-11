import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RacesState } from '../../models/app-state.model';

export const selectRacesState = createFeatureSelector<RacesState>('races');

export const selectAllRaces = createSelector(selectRacesState, (s) => s.races);
export const selectSelectedRace = createSelector(selectRacesState, (s) => s.selectedRace);
export const selectRacesLoading = createSelector(selectRacesState, (s) => s.loading);
export const selectSelectedSeason = createSelector(selectRacesState, (s) => s.selectedSeason);
