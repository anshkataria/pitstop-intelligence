import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { LucideAngularModule, ArrowLeft, Flag, CalendarDays } from 'lucide-angular';
import { IntelligenceShellComponent } from '../../../shared/components/intelligence-shell/intelligence-shell.component';
import { DriversActions } from '../../../core/store/drivers/drivers.actions';
import { DriverService } from '../../../core/services/driver.service';
import { DriverSeasonStats, RaceResult } from '../../../core/models/race-result.model';
import {
  selectSelectedDriver,
  selectDriversLoading,
} from '../../../core/store/drivers/drivers.selectors';
import { SeasonService } from '../../../core/services/season.service';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [RouterLink, FormsModule, LucideAngularModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen profile">
      <a routerLink="/drivers" class="back"><lucide-icon [img]="back" [size]="18" /> Drivers</a>
      @if (loading()) {
        <div class="card state">Loading driver…</div>
      } @else if (driver(); as d) {
        <header class="profile-hero card">
          <div class="portrait">{{ d.firstName[0] }}{{ d.lastName[0] }}</div>
          <div class="identity">
            <p class="eyebrow">DRIVER PROFILE</p>
            <h1>{{ d.fullName }}</h1>
            <p>
              <lucide-icon [img]="flag" [size]="14" />
              {{ d.nationality || 'Unknown nationality' }} &nbsp;
              <lucide-icon [img]="calendar" [size]="14" />
              {{ d.dateOfBirth || 'Unknown birth date' }}
            </p>
          </div>
          <select [(ngModel)]="season" (ngModelChange)="loadSeason()">
            @for (year of seasons(); track year) {
              <option [ngValue]="year">{{ year }} Season</option>
            }
          </select>
        </header>
        <nav class="tabs">
          <a class="active">Overview</a><a>Stats</a><a>Performance</a><a>Career</a>
        </nav>
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
            <div class="small-stats">
              @if (stats(); as s) {
                <span
                  >Average finish {{ s.averageFinish ?? '—' }} · {{ s.polePositions }} poles ·
                  {{ s.dnfs }} DNFs</span
                >
              } @else {
                <span>Season results are not available yet.</span>
              }
            </div>
          </article>
          <article class="card">
            <h2>Race forecast</h2>
            <p class="muted">Add this driver to a starting grid and forecast the result.</p>
            <a routerLink="/predictions" class="btn-primary">Create prediction</a>
          </article>
          <article class="card performance">
            <h2>Performance trend</h2>
            @if (results().length) {
              <div class="result-history">
                @for (r of results(); track r.id) {
                  <div>
                    <span>R{{ r.round }}</span
                    ><i [style.height.px]="140 - (r.finishPosition ?? 20) * 5"></i
                    ><b>P{{ r.finishPosition ?? '—' }}</b>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart"><span>No race history available.</span></div>
            }
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
        color: #333;
        text-decoration: none;
        font-size: 12px;
      }
      .profile-hero {
        display: flex;
        align-items: center;
        gap: 26px;
        padding: 30px;
      }
      .portrait {
        display: grid;
        place-items: center;
        width: 120px;
        height: 120px;
        border-radius: 60px 60px 12px 12px;
        background: linear-gradient(145deg, #ff8c1a, #d92332);
        color: #fff;
        font: 600 28px var(--ps-font-mono);
      }
      .profile-hero h1 {
        margin: 8px 0;
        font-size: 38px;
      }
      .profile-hero p {
        display: flex;
        align-items: center;
        color: #666;
      }
      .profile-hero .identity { flex: 1; }
      .profile-hero select { height: 42px; padding: 0 13px; border: 1px solid #ddd; border-radius: 6px; background: #fff; }
      .tabs {
        display: flex;
        gap: 34px;
        padding: 0 20px;
        border-bottom: 1px solid #ddd;
      }
      .tabs a {
        padding: 18px 0;
        font-size: 11px;
      }
      .tabs .active {
        color: #d92332;
        border-bottom: 2px solid #d92332;
      }
      .profile-grid {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 18px;
        margin-top: 18px;
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
        border-bottom: 1px solid #eee;
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
      }
      .small-stats {
        font-size: 11px;
        color: #777;
      }
      .performance {
        grid-column: 1/3;
      }
      .empty-chart {
        height: 170px;
        display: grid;
        place-items: center;
        background: linear-gradient(#eee 1px, transparent 1px) 0 0/100% 42px;
        color: #888;
        font-size: 11px;
      }
      .result-history {
        height: 190px;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        padding: 25px 10px 0;
        border-bottom: 1px solid #ddd;
        background: linear-gradient(#eee 1px, transparent 1px) 0 0/100% 42px;
        overflow-x: auto;
      }
      .result-history div {
        min-width: 28px;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 5px;
      }
      .result-history span,
      .result-history b {
        font: 500 8px var(--ps-font-mono);
      }
      .result-history i {
        width: 4px;
        min-height: 8px;
        background: #d92332;
        border-radius: 4px;
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
  readonly seasons = signal<number[]>([]);
  readonly back = ArrowLeft;
  readonly flag = Flag;
  readonly calendar = CalendarDays;
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
