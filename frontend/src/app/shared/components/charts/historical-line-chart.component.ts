import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  axisBottom,
  axisLeft,
  curveMonotoneX,
  line,
  max,
  min,
  pointer,
  scaleLinear,
  select,
} from 'd3';

export interface HistoricalChartPoint {
  x: number;
  y: number;
  label: string;
  detail?: string;
}

export interface HistoricalChartSeries {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: HistoricalChartPoint[];
}

@Component({
  selector: 'app-historical-line-chart',
  standalone: true,
  template: `<div #container class="chart-wrap">
    <svg #svg role="img" [attr.aria-label]="ariaLabel"></svg>
    <div #tooltip class="tooltip" hidden></div>
    @if (!hasData()) { <div class="empty">No historical data available.</div> }
    @if (series.length > 1) {
      <div class="legend" aria-hidden="true">
        @for (item of series; track item.key) {
          <span><i [style.background]="item.color" [class.dashed]="item.dashed"></i>{{ item.label }}</span>
        }
      </div>
    }
    <p class="sr-summary">{{ accessibleSummary() }}</p>
  </div>`,
  styleUrl: './historical-line-chart.component.scss',
})
export class HistoricalLineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() series: HistoricalChartSeries[] = [];
  @Input() ariaLabel = 'Historical line chart';
  @Input() xLabel = 'Round';
  @Input() yLabel = 'Value';
  @Input() reverseY = false;
  @Input() integerY = false;
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

  ngOnChanges(): void {
    if (this.ready) this.render();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  hasData(): boolean {
    return this.series.some((item) => item.points.length > 0);
  }

  accessibleSummary(): string {
    const summaries = this.series.filter((item) => item.points.length).map((item) => {
      const first = item.points[0];
      const last = item.points[item.points.length - 1];
      return first && last
        ? `${item.label}: ${first.y} at ${first.label}, ${last.y} at ${last.label}.`
        : '';
    });
    return summaries.length ? summaries.join(' ') : 'No historical data available.';
  }

  private render(): void {
    const allPoints = this.series.flatMap((item) => item.points);
    const svg = select(this.svg.nativeElement);
    svg.selectAll('*').remove();
    if (!allPoints.length) return;

    const width = Math.max(this.container.nativeElement.clientWidth, 320);
    const height = 255;
    const margin = { top: 38, right: 20, bottom: 42, left: 48 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const xMin = min(allPoints, (point) => point.x) ?? 0;
    const xMax = max(allPoints, (point) => point.x) ?? xMin + 1;
    const yMin = min(allPoints, (point) => point.y) ?? 0;
    const yMax = max(allPoints, (point) => point.y) ?? yMin + 1;
    const x = scaleLinear().domain(xMin === xMax ? [xMin - 1, xMax + 1] : [xMin, xMax]).range([0, innerWidth]);
    const normalYDomain: [number, number] = [Math.min(0, yMin), yMin === yMax ? yMax + 1 : yMax];
    const reversedYDomain: [number, number] = [Math.max(2, yMax), Math.min(1, yMin)];
    const y = scaleLinear().domain(this.reverseY ? reversedYDomain : normalYDomain)
      .nice().range([innerHeight, 0]);
    const plot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const yAxis = axisLeft(y).ticks(5).tickSize(-innerWidth)
      .tickFormat((value) => this.integerY ? `${Math.round(Number(value))}` : `${value}`);
    plot.append('g').attr('class', 'axis grid-axis').call(yAxis);
    plot.append('g').attr('class', 'axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(axisBottom(x).ticks(Math.min(10, Math.max(2, xMax - xMin + 1))).tickFormat((value) => `${Math.round(Number(value))}`));

    svg.append('text').attr('class', 'axis-label').attr('x', margin.left + innerWidth / 2)
      .attr('y', height - 5).attr('text-anchor', 'middle').text(this.xLabel);
    svg.append('text').attr('class', 'axis-label').attr('transform', 'rotate(-90)')
      .attr('x', -(margin.top + innerHeight / 2)).attr('y', 11)
      .attr('text-anchor', 'middle').text(this.yLabel);

    const path = line<HistoricalChartPoint>()
      .x((point) => x(point.x)).y((point) => y(point.y)).curve(curveMonotoneX);
    for (const item of this.series) {
      if (!item.points.length) continue;
      plot.append('path').datum(item.points).attr('class', 'series-line')
        .attr('stroke', item.color).attr('stroke-dasharray', item.dashed ? '5 5' : null)
        .attr('d', path);
      plot.selectAll(`circle.point-${item.key}`).data(item.points).join('circle')
        .attr('class', `point point-${item.key}`).attr('cx', (point) => x(point.x))
        .attr('cy', (point) => y(point.y)).attr('r', 3.5).attr('fill', item.color)
        .attr('tabindex', 0).attr('role', 'img')
        .attr('aria-label', (point) => this.pointLabel(item, point))
        .on('pointerenter pointermove', (event: PointerEvent, point) => this.showTooltip(event, item, point))
        .on('focus', (event: FocusEvent, point) => this.showTooltip(event, item, point))
        .on('blur', () => this.hideTooltip())
        .on('pointerleave', () => this.hideTooltip());
    }
  }

  private showTooltip(
    event: Event,
    series: HistoricalChartSeries,
    point: HistoricalChartPoint,
  ): void {
    const [x, y] = pointer(event, this.container.nativeElement);
    const tooltip = this.tooltip.nativeElement;
    tooltip.hidden = false;
    tooltip.textContent = this.pointLabel(series, point);
    tooltip.style.left = `${Math.max(8, Math.min(x + 12, this.container.nativeElement.clientWidth - 175))}px`;
    tooltip.style.top = `${Math.max(8, y - 42)}px`;
  }

  private pointLabel(series: HistoricalChartSeries, point: HistoricalChartPoint): string {
    return `${series.label} · ${point.label}: ${point.y}${point.detail ? ` · ${point.detail}` : ''}`;
  }

  private hideTooltip(): void {
    this.tooltip.nativeElement.hidden = true;
  }
}
