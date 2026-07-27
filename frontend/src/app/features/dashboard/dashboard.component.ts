import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { SeasonService } from '../../core/services/season.service';
import { RaceService } from '../../core/services/race.service';
import { StandingsService } from '../../core/services/standings.service';
import { ConstructorService } from '../../core/services/constructor.service';
import { DriverStanding } from '../../core/models/standing.model';
import { ConstructorStanding } from '../../core/models/constructor.model';
import { RaceResult } from '../../core/models/race-result.model';
import {
  HistoricalChartSeries,
  HistoricalLineChartComponent,
} from '../../shared/components/charts/historical-line-chart.component';

// Fixed-order categorical palette (validated for CVD-safe adjacency) — one hue per
// series identity, never reassigned when the list changes.
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, IntelligenceShellComponent, HistoricalLineChartComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">SEASON OVERVIEW</p>
          <h1>{{ season }} Season</h1>
          <p>Standings, form and points trend through the latest round.</p>
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
        <section class="stat-strip">
          <article class="card stat">
            <small>ROUNDS COMPLETED</small>
            <strong>{{ s.raceCount }}</strong>
          </article>
          <article class="card stat">
            <small>CHAMPIONSHIP LEADER</small>
            @if (leader(); as l) {
              <strong>{{ l.driverName }}</strong>
              <span>{{ l.points }} pts · {{ l.constructorName }}</span>
            } @else {
              <strong>—</strong>
            }
          </article>
          <article class="card stat">
            <small>LEAD OVER P2</small>
            @if (pointsGap(); as gap) {
              <strong>+{{ gap }}</strong>
              <span>pts vs {{ runnerUp()!.driverName }}</span>
            } @else {
              <strong>—</strong>
            }
          </article>
          <article class="card stat">
            <small>LAST RACE WINNER</small>
            @if (lastRaceWinner(); as w) {
              <strong>{{ w.driverName }}</strong>
              <a [routerLink]="['/races', s.seasonYear, s.race.round]">{{ s.race.name }}</a>
            } @else {
              <strong>—</strong>
            }
          </article>
        </section>
        <section class="dashboard-grid">
          <article class="card standings">
            <div class="card-head">
              <div>
                <h2>DRIVER STANDINGS</h2>
                <p>Points, wins and podiums this season</p>
              </div>
              <a routerLink="/drivers">All drivers</a>
            </div>
            @for (d of driverStandings().slice(0, 8); track d.driverId) {
              <div class="standing-row" [class.top3]="d.position <= 3">
                <b>{{ d.position }}</b>
                <p>
                  <strong>{{ d.driverName }}</strong><small>{{ d.constructorName }}</small>
                </p>
                <span class="mini-stats">{{ d.wins }}W · {{ d.podiums }}P</span>
                <strong class="points">{{ d.points }}</strong>
              </div>
            } @empty {
              <div class="empty">Standings will appear once results are recorded.</div>
            }
          </article>
          <article class="card constructors">
            <div class="card-head">
              <div>
                <h2>CONSTRUCTOR STANDINGS</h2>
                <p>Team points this season</p>
              </div>
              <a routerLink="/teams">All teams</a>
            </div>
            @for (c of topConstructors(); track c.constructorId) {
              <div class="constructor-row">
                <b>{{ c.position }}</b>
                <p>{{ c.constructorName }}</p>
                <i><b [style.width.%]="(c.points / maxConstructorPoints()) * 100"></b></i>
                <strong>{{ c.points }}</strong>
              </div>
            } @empty {
              <div class="empty">No constructor standings yet.</div>
            }
          </article>
          <article class="card points-chart">
            <div class="card-head">
              <div>
                <h2>POINTS PROGRESSION</h2>
                <p>Top 5 drivers, cumulative points by round</p>
              </div>
            </div>
            <app-historical-line-chart
              [series]="pointsSeries()"
              xLabel="Round"
              yLabel="Points"
              ariaLabel="Cumulative points for the top five drivers through the selected season"
            />
          </article>
        </section>
        <a routerLink="/predictions" class="cta-strip">
          <span><strong>Curious how the next race plays out?</strong> Build a starting grid and run the finishing-order model.</span>
          <span class="cta-arrow">Run a prediction →</span>
        </a>
      }
    </section></app-intelligence-shell
  >`,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly service = inject(DashboardService);
  private readonly seasonService = inject(SeasonService);
  private readonly raceService = inject(RaceService);
  private readonly standingsService = inject(StandingsService);
  private readonly constructorService = inject(ConstructorService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly seasons = signal<number[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly seasonResults = signal<RaceResult[]>([]);
  readonly driverStandings = signal<DriverStanding[]>([]);
  readonly constructorStandings = signal<ConstructorStanding[]>([]);

  readonly leader = computed(() => this.driverStandings()[0] ?? null);
  readonly runnerUp = computed(() => this.driverStandings()[1] ?? null);
  readonly pointsGap = computed(() => {
    const leader = this.leader();
    const runnerUp = this.runnerUp();
    return leader && runnerUp ? Math.round((leader.points - runnerUp.points) * 10) / 10 : null;
  });
  readonly lastRaceWinner = computed(
    () => this.summary()?.classification.find((r) => r.finishPosition === 1) ?? null,
  );
  readonly topConstructors = computed(() => this.constructorStandings().slice(0, 6));
  readonly maxConstructorPoints = computed(() =>
    Math.max(1, ...this.topConstructors().map((c) => c.points)),
  );
  readonly pointsSeries = computed<HistoricalChartSeries[]>(() =>
    this.buildPointsSeries(this.seasonResults(), this.driverStandings()),
  );

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
    this.driverStandings.set([]);
    this.constructorStandings.set([]);

    this.raceService.getSeasonResults(this.season).subscribe({
      next: (results) => this.seasonResults.set(results),
      error: () => this.seasonResults.set([]),
    });
    this.standingsService.getDriverStandings(this.season).subscribe({
      next: (standings) => this.driverStandings.set(standings),
      error: () => this.driverStandings.set([]),
    });
    this.constructorService.getStandings(this.season).subscribe({
      next: (standings) => this.constructorStandings.set(standings),
      error: () => this.constructorStandings.set([]),
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

  private buildPointsSeries(results: RaceResult[], standings: DriverStanding[]): HistoricalChartSeries[] {
    const top = standings.slice(0, 5);
    if (!top.length) return [];
    const byDriver = new Map<string, RaceResult[]>();
    for (const result of results) {
      const entries = byDriver.get(result.driverRef) ?? [];
      entries.push(result);
      byDriver.set(result.driverRef, entries);
    }
    return top.map((driver, index) => {
      const entries = [...(byDriver.get(driver.driverRef) ?? [])].sort((a, b) => a.round - b.round);
      let cumulative = 0;
      return {
        key: driver.driverRef,
        label: driver.driverName,
        color: SERIES_COLORS[index] ?? '#6e7074',
        points: entries.map((result) => {
          cumulative += Number(result.points ?? 0);
          return { x: result.round, y: cumulative, label: `Round ${result.round}` };
        }),
      };
    });
  }
}
