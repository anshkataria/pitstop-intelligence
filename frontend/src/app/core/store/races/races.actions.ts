import { createActionGroup, props } from '@ngrx/store';
import { Race } from '../../models/race.model';

export const RacesActions = createActionGroup({
  source: 'Races',
  events: {
    'Load Season Races': props<{ year: number }>(),
    'Load Season Races Success': props<{ races: Race[] }>(),
    'Load Season Races Failure': props<{ error: string }>(),
    'Select Season': props<{ year: number }>(),
    'Select Race': props<{ race: Race }>(),
  },
});
