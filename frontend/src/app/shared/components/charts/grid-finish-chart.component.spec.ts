import { TestBed } from '@angular/core/testing';
import { RaceResult } from '../../../core/models/race-result.model';
import { GridFinishChartComponent } from './grid-finish-chart.component';

describe('GridFinishChartComponent', () => {
  it('plots classified drivers and describes the largest gain', async () => {
    await TestBed.configureTestingModule({
      imports: [GridFinishChartComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(GridFinishChartComponent);
    fixture.componentRef.setInput('results', [
      result(1, 'Lando Norris', 'norris', 5, 2),
      result(2, 'Oscar Piastri', 'piastri', 2, 3),
    ]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.driver').length).toBe(2);
    expect(element.querySelector('.par-line')).toBeTruthy();
    expect(element.querySelector('.driver')?.getAttribute('aria-label')).toContain('Grid 5 → P2');
    expect(element.querySelector('.sr-summary')?.textContent).toContain('Lando Norris gained the most');
  });
});

function result(
  id: number,
  driverName: string,
  driverRef: string,
  gridPosition: number,
  finishPosition: number,
): RaceResult {
  return {
    id,
    raceId: 1,
    seasonYear: 2024,
    round: 1,
    driverId: id,
    driverRef,
    driverName,
    constructorId: 1,
    constructorRef: 'mclaren',
    constructorName: 'McLaren',
    gridPosition,
    finishPosition,
    points: 18,
    status: 'Finished',
  };
}
