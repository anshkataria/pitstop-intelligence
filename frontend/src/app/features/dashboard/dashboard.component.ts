import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { SeasonService } from '../../core/services/season.service';
import { RaceService } from '../../core/services/race.service';
import { RaceResult } from '../../core/models/race-result.model';
import {
  HistoricalChartSeries,
  HistoricalLineChartComponent,
} from '../../shared/components/charts/historical-line-chart.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, IntelligenceShellComponent, HistoricalLineChartComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">SEASON OVERVIEW</p>
          <h1>{{ summary()?.race?.name || 'Dashboard' }}</h1>
          <p>
            @if (summary(); as s) {
              Round {{ s.race.round }} · {{ s.race.circuitName }} · {{ s.race.raceDate }}
            } @else {
              Historical race intelligence
            }
          </p>
        </div>
        <select [(ngModel)]="season" (ngModelChange)="load()">
          @for (year of seasons(); track year) {
            <option [ngValue]="year">{{ year }} Season</option>
          }
        </select>
      </header>
      @if (loading()) {
        <div class="card state">Loading season summary…</div>
      } @else if (error()) {
        <div class="card state">{{ error() }}</div>
      } @else if (summary(); as s) {
        <section class="metrics">
          <article class="card">
            <small>SEASON</small><strong>{{ s.seasonYear }}</strong>
          </article>
          <article class="card">
            <small>ROUNDS</small><strong>{{ s.raceCount }}</strong>
          </article>
          <article class="card">
            <small>DRIVERS</small><strong>{{ s.driverCount }}</strong>
          </article>
          <article class="card">
            <small>CLASSIFIED</small><strong>{{ s.resultCount }}</strong>
          </article>
        </section>
        <section class="dashboard-grid">
          <article class="card classification">
            <div class="card-head">
              <h2>LATEST CLASSIFICATION</h2>
              <a [routerLink]="['/races', s.race.seasonYear, s.race.round]">Full race</a>
            </div>
            @for (r of s.classification.slice(0, 10); track r.id) {
              <div class="result">
                <b>{{ r.finishPosition }}</b
                ><span class="avatar">{{ initials(r.driverName) }}</span>
                <p>
                  <strong>{{ r.driverName }}</strong
                  ><small>{{ r.constructorName }}</small>
                </p>
                <em>{{ r.points }} pts</em>
              </div>
            } @empty {
              <div class="empty">No classification available.</div>
            }
          </article>
          <article class="card movement">
            <h2>GRID TO FINISH</h2>
            <p>Position gained or lost</p>
            <div class="movement-list">
              @for (r of s.classification.slice(0, 10); track r.id) {
                <div>
                  <span>{{ r.driverRef.toUpperCase() }}</span
                  ><i><b [class.loss]="movement(r) < 0" [style.width.%]="movementWidth(r)"></b></i
                  ><strong [class.negative]="movement(r) < 0"
                    >{{ movement(r) > 0 ? '+' : '' }}{{ movement(r) }}</strong
                  >
                </div>
              }
            </div>
          </article>
          <article class="card model">
            <h2>NEXT FORECAST</h2>
            <p>Build a starting grid and run the finishing-order model.</p>
            <a routerLink="/predictions" class="btn-primary">Create prediction</a>
          </article>
          <article class="card season-note">
            <h2>DATA COVERAGE</h2>
            <p>
              Season totals and the latest classification are aggregated by the intelligence API,
              keeping calculation rules consistent across every client.
            </p>
          </article>
          <article class="card points-chart">
            <div class="card-head"><div><h2>POINTS PROGRESSION</h2><p>Leading drivers across completed rounds</p></div></div>
            <app-historical-line-chart
              [series]="pointsSeries()"
              xLabel="Round"
              yLabel="Points"
              ariaLabel="Cumulative driver points through the selected season"
            />
          </article>
        </section>
      }
    </section></app-intelligence-shell
  >`,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly service = inject(DashboardService);
  private readonly seasonService = inject(SeasonService);
  private readonly raceService = inject(RaceService);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly seasons = signal<number[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly seasonResults = signal<RaceResult[]>([]);
  readonly pointsSeries = computed<HistoricalChartSeries[]>(() => this.buildPointsSeries(this.seasonResults()));
  season = 2024;
  constructor() {
    this.seasonService.getAll().subscribe({
      next: (years) => {
        this.seasons.set(years);
        this.season = years[0] ?? this.season;
        this.load();
      },
      error: () => this.load(),
    });
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.seasonResults.set([]);
    this.raceService.getSeasonResults(this.season).subscribe({
      next: (results) => this.seasonResults.set(results),
      error: () => this.seasonResults.set([]),
    });
    this.service.getSeasonSummary(this.season).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load the season summary.');
        this.loading.set(false);
      },
    });
  }
  initials(name: string) {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2);
  }
  movement(result: { gridPosition: number | null; finishPosition: number | null }) {
    return (result.gridPosition ?? 0) - (result.finishPosition ?? 0);
  }
  movementWidth(result: { gridPosition: number | null; finishPosition: number | null }) {
    return Math.min(100, Math.max(8, Math.abs(this.movement(result)) * 10));
  }

  private buildPointsSeries(results: RaceResult[]): HistoricalChartSeries[] {
    const colors = ['#d92332', '#24688a', '#d98516', '#2d7d5b', '#7a5aa6'];
    const grouped = new Map<string, RaceResult[]>();
    for (const result of results) {
      const entries = grouped.get(result.driverRef) ?? [];
      entries.push(result);
      grouped.set(result.driverRef, entries);
    }
    return [...grouped.entries()]
      .map(([driverRef, entries]) => ({
        driverRef,
        name: entries[0]?.driverName ?? driverRef,
        entries: [...entries].sort((a, b) => a.round - b.round),
        total: entries.reduce((sum, result) => sum + Number(result.points ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total).slice(0, 5)
      .map((driver, index) => {
        let cumulative = 0;
        return {
          key: driver.driverRef,
          label: driver.name,
          color: colors[index] ?? '#6e7074',
          points: driver.entries.map((result) => {
            cumulative += Number(result.points ?? 0);
            return { x: result.round, y: cumulative, label: `Round ${result.round}` };
          }),
        };
      });
  }
}
