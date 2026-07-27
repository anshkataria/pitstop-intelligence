import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { RacesActions } from '../../core/store/races/races.actions';
import {
  selectAllRaces,
  selectRacesLoading,
  selectSelectedSeason,
} from '../../core/store/races/races.selectors';
import { SeasonService } from '../../core/services/season.service';

@Component({
  selector: 'app-race-list',
  standalone: true,
  imports: [FormsModule, RouterLink, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">CALENDAR</p>
          <h1>Grand Prix Schedule</h1>
          <p>Every round, circuit and race date.</p>
        </div>
        <select class="ps-select" [(ngModel)]="season" (ngModelChange)="load()">
          @for (year of seasons(); track year) {
            <option [ngValue]="year">{{ year }}</option>
          }
        </select>
      </header>
      <div class="race-grid">
        @if (loading()) {
          <div class="card state">Loading race calendar…</div>
        } @else {
          @for (r of races(); track r.id) {
            <a class="card race" [routerLink]="['/races', r.seasonYear, r.round]"
              ><span class="round">ROUND {{ r.round }}</span>
              <h2>{{ r.name }}</h2>
              <p>{{ r.circuitName }}</p>
              <footer>
                <span>{{ r.country }}</span
                ><time>{{ r.raceDate }}</time>
              </footer></a
            >
          } @empty {
            <div class="card state">No races found for {{ season }}.</div>
          }
        }
      </div>
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .screen-head select {
        min-width: 150px;
      }
      .race-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
      .race {
        padding: 22px;
        color: inherit;
        text-decoration: none;
        transition:
          transform 0.16s ease,
          border-color 0.16s ease;
      }
      .race:hover {
        transform: translateY(-2px);
        border-color: #d92332;
      }
      .round {
        font: 600 9px var(--ps-font-mono);
        color: var(--ps-red);
      }
      .race h2 {
        margin: 18px 0 7px;
        font-size: 19px;
      }
      .race p {
        min-height: 35px;
        color: var(--ps-text-secondary);
        font-size: 11px;
      }
      .race footer {
        display: flex;
        justify-content: space-between;
        padding-top: 16px;
        border-top: 1px solid var(--ps-border);
        font-size: 10px;
      }
      .state {
        padding: 60px;
        text-align: center;
        color: var(--ps-text-secondary);
      }
      @media (max-width: 1000px) {
        .race-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 620px) {
        .race-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RaceListComponent implements OnInit {
  private store = inject(Store);
  private readonly seasonService = inject(SeasonService);
  readonly races = this.store.selectSignal(selectAllRaces);
  readonly loading = this.store.selectSignal(selectRacesLoading);
  readonly seasons = signal<number[]>([]);
  season = 2024;
  ngOnInit() {
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
    this.store.dispatch(RacesActions.selectSeason({ year: +this.season }));
    this.store.dispatch(RacesActions.loadSeasonRaces({ year: +this.season }));
  }
}
