import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { RaceService } from '../../core/services/race.service';
import { RaceResult } from '../../core/models/race-result.model';
import { flagForCountry } from '../../shared/utils/country-flag';
import { colorForTeam } from '../../shared/utils/team-color';

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
            <a
              class="card race"
              [class.next]="r.round === nextRound()"
              [routerLink]="['/races', r.seasonYear, r.round]"
            >
              <div class="race-head">
                <span class="round">ROUND {{ r.round }}</span>
                @if (r.round === nextRound()) {
                  <span class="ps-badge ps-badge--info">Next race</span>
                } @else if (!isCompleted(r.round)) {
                  <span class="ps-badge ps-badge--neutral">Upcoming</span>
                }
              </div>
              <h2>{{ r.name }}</h2>
              <p>{{ r.circuitName }}</p>
              <div class="winner-row">
                @if (winnerOf(r.round); as w) {
                  <i class="dot" [style.background]="teamColor(w.constructorName)"></i>
                  <strong>{{ w.driverName }}</strong>
                }
              </div>
              <footer>
                <span>{{ flagForCountry(r.country) }} {{ r.country }}</span><time>{{ r.raceDate }}</time>
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
        border-color: var(--ps-red);
      }
      .race.next {
        border-left: 3px solid var(--ps-red);
      }
      .race-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
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
      .winner-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 20px;
        margin-bottom: 4px;
        font-size: 12px;
      }
      .winner-row .dot {
        width: 8px;
        height: 8px;
        flex-shrink: 0;
        border-radius: 50%;
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
  private readonly raceService = inject(RaceService);
  readonly races = this.store.selectSignal(selectAllRaces);
  readonly loading = this.store.selectSignal(selectRacesLoading);
  readonly seasons = signal<number[]>([]);
  readonly seasonResults = signal<RaceResult[]>([]);
  readonly completedRounds = computed(() => new Set(this.seasonResults().map((r) => r.round)));
  readonly nextRound = computed(() => {
    const completed = this.completedRounds();
    const upcoming = this.races()
      .map((r) => r.round)
      .filter((round) => !completed.has(round))
      .sort((a, b) => a - b);
    return upcoming[0] ?? null;
  });
  readonly flagForCountry = flagForCountry;
  readonly teamColor = colorForTeam;
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
    this.seasonResults.set([]);
    this.raceService.getSeasonResults(this.season).subscribe({
      next: (results) => this.seasonResults.set(results),
      error: () => this.seasonResults.set([]),
    });
  }

  isCompleted(round: number): boolean {
    return this.completedRounds().has(round);
  }

  winnerOf(round: number): RaceResult | null {
    return this.seasonResults().find((r) => r.round === round && r.finishPosition === 1) ?? null;
  }
}
