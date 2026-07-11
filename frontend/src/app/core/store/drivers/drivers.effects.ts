import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { DriversActions } from './drivers.actions';
import { DriverService } from '../../services/driver.service';

@Injectable()
export class DriversEffects {
  private readonly actions$ = inject(Actions);
  private readonly driverService = inject(DriverService);

  loadDrivers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DriversActions.loadDrivers),
      switchMap(({ page, size, search }) =>
        this.driverService.getAll(page, size, search).pipe(
          map((response) => DriversActions.loadDriversSuccess({ response })),
          catchError((error) => of(DriversActions.loadDriversFailure({ error: error.message }))),
        ),
      ),
    ),
  );

  loadDriverById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DriversActions.loadDriverById),
      switchMap(({ id }) =>
        this.driverService.getById(id).pipe(
          map((driver) => DriversActions.loadDriverSuccess({ driver })),
          catchError((error) => of(DriversActions.loadDriverFailure({ error: error.message }))),
        ),
      ),
    ),
  );
}
