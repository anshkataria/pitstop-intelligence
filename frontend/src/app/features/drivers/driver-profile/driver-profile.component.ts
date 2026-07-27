import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { LucideAngularModule, ArrowLeft, CalendarDays } from 'lucide-angular';
import { IntelligenceShellComponent } from '../../../shared/components/intelligence-shell/intelligence-shell.component';
import { DriversActions } from '../../../core/store/drivers/drivers.actions';
import { DriverService } from '../../../core/services/driver.service';
import { DriverSeasonStats, RaceResult } from '../../../core/models/race-result.model';
import {
  selectSelectedDriver,
  selectDriversLoading,
} from '../../../core/store/drivers/drivers.selectors';
import { SeasonService } from '../../../core/services/season.service';
import {
  HistoricalChartSeries,
  HistoricalLineChartComponent,
} from '../../../shared/components/charts/historical-line-chart.component';
import { flagFor } from '../../../shared/utils/nationality-flag';
import { colorForTeam } from '../../../shared/utils/team-color';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideAngularModule, IntelligenceShellComponent, HistoricalLineChartComponent],
  template: `<app-intelligence-shell
    ><section class="screen profile">
      <a routerLink="/drivers" class="back"><lucide-icon [img]="back" [size]="18" /> Drivers</a>
      @if (loading()) {
        <div class="card state">Loading driver…</div>
      } @else if (driver(); as d) {
        <header class="profile-hero card" [style.--team-color]="teamColor()">
          <div class="portrait">{{ d.firstName[0] }}{{ d.lastName[0] }}</div>
          <div class="identity">
            <p class="eyebrow">DRIVER PROFILE</p>
            <h1>{{ d.fullName }}</h1>
            <div class="tags">
              @if (flagFor(d.nationality); as f) {
                <span class="tag">{{ f }} {{ d.nationality }}</span>
              } @else if (d.nationality) {
                <span class="tag">{{ d.nationality }}</span>
              }
              @if (currentTeam(); as team) {
                <span class="tag team">{{ team }}</span>
              }
              <span class="tag">
                <lucide-icon [img]="calendar" [size]="12" />
                {{ d.dateOfBirth || 'Unknown birth date' }}
              </span>
            </div>
          </div>
          <select class="ps-select" [(ngModel)]="season" (ngModelChange)="loadSeason()">
            @for (year of seasons(); track year) {
              <option [ngValue]="year">{{ year }} Season</option>
            }
          </select>
        </header>
        <div class="profile-grid">
          <article class="card season">
            <h2>{{ season }} Season</h2>
            <div class="big-stats">
              <div>
                <strong>{{ stats()?.points ?? '—' }}</strong
                ><span>Points</span>
              </div>
              <div>
                <strong>{{ stats()?.wins ?? '—' }}</strong
                ><span>Wins</span>
              </div>
              <div>
                <strong>{{ stats()?.podiums ?? '—' }}</strong
                ><span>Podiums</span>
              </div>
            </div>
            @if (stats(); as s) {
              <div class="mini-stats">
                <div>
                  <strong>{{ s.averageFinish ?? '—' }}</strong><span>Avg finish</span>
                </div>
                <div>
                  <strong>{{ s.polePositions }}</strong><span>Poles</span>
                </div>
                <div>
                  <strong>{{ s.dnfs }}</strong><span>DNFs</span>
                </div>
              </div>
            } @else {
              <p class="muted">Season results are not available yet.</p>
            }
          </article>
          <article class="card">
            <h2>Race forecast</h2>
            <p class="muted">Add this driver to a starting grid and forecast the result.</p>
            <a routerLink="/predictions" class="btn-primary">Create prediction</a>
          </article>
          <article class="card performance">
            <h2>Performance trend</h2>
            <app-historical-line-chart
              [series]="positionSeries()"
              [reverseY]="true"
              [integerY]="true"
              xLabel="Round"
              yLabel="Position"
              [ariaLabel]="d.fullName + ' grid and finishing position by round'"
            />
          </article>
        </div>
      }
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        color: var(--ps-text-secondary);
        text-decoration: none;
        font-size: 12px;
      }
      .profile-hero {
        --team-color: var(--ps-text);
        display: flex;
        align-items: center;
        gap: 26px;
        padding: 30px;
        margin-bottom: 18px;
        border-top: 4px solid var(--team-color);
      }
      .portrait {
        display: grid;
        place-items: center;
        width: 120px;
        height: 120px;
        border-radius: 60px 60px 12px 12px;
        background: linear-gradient(145deg, var(--team-color), var(--ps-text));
        color: #fff;
        font: 600 28px var(--ps-font-mono);
      }
      .profile-hero h1 {
        margin: 8px 0 14px;
        font-size: 38px;
      }
      .profile-hero .identity { flex: 1; }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 11px;
        border-radius: 20px;
        background: var(--ps-bg);
        color: var(--ps-text-secondary);
        font-size: 11px;
        font-weight: 500;
      }
      .tag.team {
        background: color-mix(in srgb, var(--team-color) 14%, transparent);
        color: var(--team-color);
        font-weight: 600;
      }
      .profile-hero select { min-width: 150px; }
      .profile-grid {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 18px;
      }
      .profile-grid article {
        padding: 22px;
      }
      .season {
        grid-column: 1;
      }
      .big-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin: 30px 0;
        border-bottom: 1px solid var(--ps-border);
      }
      .big-stats div {
        padding-bottom: 22px;
      }
      .big-stats strong,
      .big-stats span {
        display: block;
      }
      .big-stats strong {
        font: 500 30px var(--ps-font-mono);
      }
      .big-stats span {
        font-size: 10px;
        color: var(--ps-text-secondary);
      }
      .mini-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .mini-stats div {
        padding: 12px;
        border-radius: var(--ps-radius-sm);
        background: var(--ps-bg);
        text-align: center;
      }
      .mini-stats strong {
        display: block;
        font: 600 18px var(--ps-font-mono);
      }
      .mini-stats span {
        display: block;
        margin-top: 4px;
        color: var(--ps-text-secondary);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .muted {
        color: var(--ps-text-secondary);
        font-size: 11px;
      }
      .performance {
        grid-column: 1/3;
      }
      .state {
        padding: 60px;
      }
      @media (max-width: 800px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
        .performance,
        .season {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class DriverProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private store = inject(Store);
  private driverService = inject(DriverService);
  private readonly seasonService = inject(SeasonService);
  readonly driver = this.store.selectSignal(selectSelectedDriver);
  readonly loading = this.store.selectSignal(selectDriversLoading);
  readonly stats = signal<DriverSeasonStats | null>(null);
  readonly results = signal<RaceResult[]>([]);
  readonly currentTeam = computed(
    () => [...this.results()].sort((a, b) => b.round - a.round)[0]?.constructorName ?? null,
  );
  readonly teamColor = computed(() => colorForTeam(this.currentTeam()));
  readonly positionSeries = computed<HistoricalChartSeries[]>(() => [
    {
      key: 'finish', label: 'Finish', color: '#2a78d6',
      points: this.results().filter((result) => result.finishPosition != null).map((result) => ({
        x: result.round, y: result.finishPosition as number, label: `Round ${result.round}`,
        detail: `${result.points} points`,
      })),
    },
    {
      key: 'grid', label: 'Grid', color: '#6e7074', dashed: true,
      points: this.results().filter((result) => result.gridPosition != null).map((result) => ({
        x: result.round, y: result.gridPosition as number, label: `Round ${result.round}`,
      })),
    },
  ]);
  readonly seasons = signal<number[]>([]);
  readonly back = ArrowLeft;
  readonly calendar = CalendarDays;
  readonly flagFor = flagFor;
  private driverId = 0;
  season = 2024;
  ngOnInit() {
    this.driverId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.driverId) return;
    this.store.dispatch(DriversActions.loadDriverById({ id: this.driverId }));
    this.seasonService.getAll().subscribe({
      next: (years) => {
        this.seasons.set(years);
        this.season = years[0] ?? this.season;
        this.loadSeason();
      },
      error: () => this.loadSeason(),
    });
  }

  loadSeason(): void {
    this.stats.set(null);
    this.results.set([]);
    this.driverService.getStats(this.driverId, this.season).subscribe({ next: (stats) => this.stats.set(stats) });
    this.driverService.getResults(this.driverId, this.season).subscribe({ next: (results) => this.results.set(results) });
  }
}
