import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Driver, PagedResponse } from '../../models/driver.model';

export const DriversActions = createActionGroup({
  source: 'Drivers',
  events: {
    'Load Drivers': props<{ page: number; size: number; search?: string }>(),
    'Load Drivers Success': props<{ response: PagedResponse<Driver> }>(),
    'Load Drivers Failure': props<{ error: string }>(),
    'Select Driver': props<{ driver: Driver }>(),
    'Load Driver By Id': props<{ id: number }>(),
    'Load Driver Success': props<{ driver: Driver }>(),
    'Load Driver Failure': props<{ error: string }>(),
  },
});
