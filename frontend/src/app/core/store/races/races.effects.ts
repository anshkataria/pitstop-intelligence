import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { RacesActions } from './races.actions';
import { RaceService } from '../../services/race.service';

@Injectable()
export class RacesEffects {
  private readonly actions$ = inject(Actions);
  private readonly raceService = inject(RaceService);

  loadSeasonRaces$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RacesActions.loadSeasonRaces),
      switchMap(({ year }) =>
        this.raceService.getBySeason(year).pipe(
          map((races) => RacesActions.loadSeasonRacesSuccess({ races })),
          catchError((error) => of(RacesActions.loadSeasonRacesFailure({ error: error.message }))),
        ),
      ),
    ),
  );
}
