import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { axisBottom, axisLeft, max, pointer, scaleLinear, select } from 'd3';
import { RaceResult } from '../../../core/models/race-result.model';

@Component({
  selector: 'app-grid-finish-chart',
  standalone: true,
  template: `<div #container class="chart-wrap">
    <svg #svg role="img" [attr.aria-label]="ariaLabel"></svg>
    <div #tooltip class="tooltip" hidden></div>
    @if (!chartResults().length) { <div class="empty">No classified grid data available.</div> }
    <p class="sr-summary">{{ accessibleSummary() }}</p>
  </div>`,
  styleUrl: './grid-finish-chart.component.scss',
})
export class GridFinishChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() results: RaceResult[] = [];
  @Input() ariaLabel = 'Starting grid compared with finishing position';
  @ViewChild('container', { static: true }) private container!: ElementRef<HTMLDivElement>;
  @ViewChild('svg', { static: true }) private svg!: ElementRef<SVGSVGElement>;
  @ViewChild('tooltip', { static: true }) private tooltip!: ElementRef<HTMLDivElement>;
  private observer?: ResizeObserver;
  private ready = false;

  ngAfterViewInit(): void {
    this.ready = true;
    this.render();
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.render());
      this.observer.observe(this.container.nativeElement);
    }
  }
  ngOnChanges(): void { if (this.ready) this.render(); }
  ngOnDestroy(): void { this.observer?.disconnect(); }

  chartResults(): RaceResult[] {
    return this.results.filter((result) => result.gridPosition != null && result.finishPosition != null);
  }

  accessibleSummary(): string {
    const data = this.chartResults();
    if (!data.length) return 'No classified grid data available.';
    const biggestGain = data.reduce((best, result) => this.movement(result) > this.movement(best) ? result : best);
    return `${data.length} drivers compared. ${biggestGain.driverName} gained the most positions, moving from grid ${biggestGain.gridPosition} to finish ${biggestGain.finishPosition}.`;
  }

  private render(): void {
    const data = this.chartResults();
    const svg = select(this.svg.nativeElement);
    svg.selectAll('*').remove();
    if (!data.length) return;
    const width = Math.max(this.container.nativeElement.clientWidth, 320);
    const height = 285;
    const margin = { top: 18, right: 34, bottom: 45, left: 52 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const maximum = Math.max(2, max(data, (result) => Math.max(result.gridPosition ?? 0, result.finishPosition ?? 0)) ?? 20);
    const x = scaleLinear().domain([1, maximum]).range([0, innerWidth]);
    const y = scaleLinear().domain([maximum, 1]).range([innerHeight, 0]);
    svg.attr('viewBox', `0 0 ${width} ${height}`);
    const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    plot.append('line').attr('class', 'par-line').attr('x1', x(1)).attr('y1', y(1))
      .attr('x2', x(maximum)).attr('y2', y(maximum));
    plot.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).ticks(Math.min(10, maximum)).tickFormat((value) => `${Math.round(Number(value))}`));
    plot.append('g').attr('class', 'axis').call(axisLeft(y).ticks(Math.min(10, maximum))
      .tickFormat((value) => `${Math.round(Number(value))}`));
    svg.append('text').attr('class', 'axis-label').attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 5).attr('text-anchor', 'middle').text('Grid position');
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2)).attr('y', 11)
      .attr('text-anchor', 'middle').text('Finish position');
    const points = plot.selectAll('g.driver').data(data).join('g').attr('class', 'driver')
      .attr('transform', (result) => `translate(${x(result.gridPosition ?? 0)},${y(result.finishPosition ?? 0)})`)
      .attr('tabindex', 0).attr('role', 'img')
      .attr('aria-label', (result) => this.resultLabel(result))
      .on('pointerenter pointermove', (event: PointerEvent, result) => this.showTooltip(event, result))
      .on('focus', (event: FocusEvent, result) => this.showTooltip(event, result))
      .on('blur', () => this.hideTooltip())
      .on('pointerleave', () => this.hideTooltip());
    points.append('circle').attr('r', 5).attr('fill', (result) => this.color(result));
    points.append('text').attr('x', 8).attr('y', 3).text((result) => result.driverRef.slice(0, 3).toUpperCase());
  }

  private movement(result: RaceResult): number {
    return (result.gridPosition ?? 0) - (result.finishPosition ?? 0);
  }
  private color(result: RaceResult): string {
    const movement = this.movement(result);
    return movement > 0 ? '#2d7d5b' : movement < 0 ? '#d92332' : '#6e7074';
  }
  private showTooltip(event: Event, result: RaceResult): void {
    const [x, y] = pointer(event, this.container.nativeElement);
    const tooltip = this.tooltip.nativeElement;
    tooltip.hidden = false;
    tooltip.textContent = this.resultLabel(result);
    tooltip.style.left = `${Math.max(8, Math.min(x + 12, this.container.nativeElement.clientWidth - 185))}px`;
    tooltip.style.top = `${Math.max(8, y - 42)}px`;
  }
  private resultLabel(result: RaceResult): string {
    const movement = this.movement(result);
    return `${result.driverName} · Grid ${result.gridPosition} → P${result.finishPosition} · ${movement > 0 ? '+' : ''}${movement}`;
  }
  private hideTooltip(): void { this.tooltip.nativeElement.hidden = true; }
}
