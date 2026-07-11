import { createReducer, on } from '@ngrx/store';
import { DriversState } from '../../models/app-state.model';
import { DriversActions } from './drivers.actions';

export const initialDriversState: DriversState = {
  drivers: [],
  selectedDriver: null,
  loading: false,
  error: null,
  totalElements: 0,
  currentPage: 0,
};

export const driversReducer = createReducer(
  initialDriversState,

  on(DriversActions.loadDrivers, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(DriversActions.loadDriversSuccess, (state, { response }) => ({
    ...state,
    loading: false,
    drivers: response.content,
    totalElements: response.totalElements,
    currentPage: response.page,
  })),

  on(DriversActions.loadDriversFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(DriversActions.selectDriver, (state, { driver }) => ({
    ...state,
    selectedDriver: driver,
  })),

  on(DriversActions.loadDriverSuccess, (state, { driver }) => ({
    ...state,
    loading: false,
    selectedDriver: driver,
  })),

  on(DriversActions.loadDriverFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
);
