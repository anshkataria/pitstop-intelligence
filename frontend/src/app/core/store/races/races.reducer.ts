import { createReducer, on } from '@ngrx/store';
import { RacesState } from '../../models/app-state.model';
import { RacesActions } from './races.actions';

export const initialRacesState: RacesState = {
  races: [],
  selectedRace: null,
  loading: false,
  error: null,
  selectedSeason: new Date().getFullYear(),
};

export const racesReducer = createReducer(
  initialRacesState,

  on(RacesActions.loadSeasonRaces, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(RacesActions.loadSeasonRacesSuccess, (state, { races }) => ({
    ...state,
    loading: false,
    races,
  })),

  on(RacesActions.loadSeasonRacesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(RacesActions.selectSeason, (state, { year }) => ({
    ...state,
    selectedSeason: year,
    races: [],
  })),

  on(RacesActions.selectRace, (state, { race }) => ({
    ...state,
    selectedRace: race,
  })),
);
