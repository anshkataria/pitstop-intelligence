import { TestBed } from '@angular/core/testing';
import { HistoricalLineChartComponent } from './historical-line-chart.component';

describe('HistoricalLineChartComponent', () => {
  it('renders D3 axes, a series path, points, and an accessible summary', async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricalLineChartComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(HistoricalLineChartComponent);
    fixture.componentRef.setInput('series', [{
      key: 'points',
      label: 'Points',
      color: '#d92332',
      points: [
        { x: 1, y: 25, label: 'Round 1' },
        { x: 2, y: 43, label: 'Round 2' },
      ],
    }]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.axis').length).toBe(2);
    expect(element.querySelector('.series-line')).toBeTruthy();
    expect(element.querySelectorAll('.point').length).toBe(2);
    expect(element.querySelector('.point')?.getAttribute('aria-label')).toContain('Round 1');
    expect(element.querySelector('.sr-summary')?.textContent).toContain('43 at Round 2');
  });
});
