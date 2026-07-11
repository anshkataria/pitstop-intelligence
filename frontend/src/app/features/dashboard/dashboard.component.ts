import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, IntelligenceShellComponent],
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
          <option [ngValue]="2024">2024 Season</option>
          <option [ngValue]="2023">2023 Season</option>
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
              This dashboard contains historical race and classification data from PostgreSQL. Live
              telemetry and weather will be added in a later phase.
            </p>
          </article>
        </section>
      }
    </section></app-intelligence-shell
  >`,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly service = inject(DashboardService);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  season = 2024;
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.service.getSummary(this.season).subscribe({
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
}
