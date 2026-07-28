import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, ArrowUp, ArrowDown } from 'lucide-angular';
import { PredictionService } from '../../core/services/prediction.service';
import { RaceService } from '../../core/services/race.service';
import { PredictionContextEntry, PredictionResult } from '../../core/models/prediction.model';
import { Race } from '../../core/models/race.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { colorForTeam } from '../../shared/utils/team-color';
import { flagForCountry } from '../../shared/utils/country-flag';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, DatePipe, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">FORECAST</p>
          <h1>Race Prediction</h1>
          <p>Choose a race, set the grid and forecast the finishing order.</p>
        </div>
        <div><a routerLink="/predictions/history" class="history-link">Prediction history</a><span class="health" [class.online]="modelLoaded()">● {{ modelLoaded() ? 'Model ready' : 'Model unavailable' }}</span></div>
      </header>
      <div class="prediction-layout">
        <article class="card builder">
          <h2>RACE</h2>
          @if (upcomingRaces().length) {
            <div class="selectors">
              <label
                >Upcoming race<select
                  class="ps-select"
                  [(ngModel)]="selectedRaceId"
                  (ngModelChange)="loadContext()"
                >
                  @for (r of upcomingRaces(); track r.id) {
                    <option [ngValue]="r.id">{{ r.seasonYear }} · R{{ r.round }} · {{ r.name }}</option>
                  }
                </select></label
              >
            </div>
            @if (selectedRace(); as race) {
              <p class="race-meta">
                {{ flagForCountry(race.country) }} {{ race.circuitName }} · {{ race.raceDate | date: 'MMM d, y' }}
              </p>
            }
          }
          <div class="grid-head">
            <h2>STARTING GRID</h2>
            <span>{{ entries().length }} drivers</span>
          </div>
          @if (contextLoading()) {
            <div class="state">Loading grid…</div>
          } @else if (entries().length) {
            @if (provisional()) {
              <p class="hint">
                This race hasn't happened yet, so there's no confirmed grid. Showing the lineup
                from the most recent race — drag drivers into the order you expect and run the
                forecast.
              </p>
            }
            <div class="entries">
              @for (e of entries(); track e.driverRef; let i = $index) {
                <div class="entry">
                  <b>{{ i + 1 }}</b
                  ><span class="avatar" [style.background]="teamColor(e.constructorName)">{{
                    initials(e.driverName)
                  }}</span>
                  <p>
                    <strong>{{ e.driverName }}</strong
                    ><small>{{ e.constructorName }}</small>
                  </p>
                  <div>
                    <button (click)="move(i, -1)" [disabled]="i === 0">
                      <lucide-icon [img]="up" [size]="14" /></button
                    ><button (click)="move(i, 1)" [disabled]="i === entries().length - 1">
                      <lucide-icon [img]="down" [size]="14" />
                    </button>
                  </div>
                </div>
              }
            </div>
            <button
              class="btn-primary run"
              (click)="predict()"
              [disabled]="loading() || !modelLoaded()"
            >
              {{ loading() ? 'Predicting…' : 'Run prediction' }}
            </button>
          } @else {
            <div class="state">
              {{ upcomingRaces().length ? 'No starting grid is available for this race.' : 'No upcoming races on the calendar.' }}
            </div>
          }
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </article>
        <article class="card output">
          <div class="output-head">
            <h2>PREDICTED CLASSIFICATION</h2>
            @if (runId()) {
              <span>RUN #{{ runId() }}</span>
            }
          </div>
          @if (results().length) {
            @for (r of results(); track r.driverRef; let i = $index) {
              <div class="result">
                <span [style.background]="teamColor(constructorName(r.driverRef))">{{ i + 1 }}</span>
                <p>
                  <strong>{{ driverName(r.driverRef) }}</strong
                  ><small>{{ constructorName(r.driverRef) }} · Grid {{ r.gridPosition }}</small>
                </p>
                <div class="range">
                  <b>{{ r.confidenceRangeLow }}–{{ r.confidenceRangeHigh }}</b>
                  <small>RANGE</small>
                </div>
              </div>
            }
          } @else {
            <div class="empty">Your forecast will appear here.</div>
          }
        </article>
      </div>
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .health {
        padding: 9px 12px;
        border: 1px solid var(--ps-border-strong);
        border-radius: 18px;
        color: var(--ps-text-secondary);
        font: 500 9px var(--ps-font-mono);
      }
      .history-link { margin-right: 14px; color: var(--ps-text-secondary); font-size: 10px; text-decoration: none; }
      .health.online {
        color: var(--ps-green);
      }
      .prediction-layout {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 18px;
      }
      .prediction-layout article {
        padding: 22px;
      }
      .selectors {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin: 18px 0 8px;
      }
      .selectors label {
        font-size: 9px;
        color: var(--ps-text-secondary);
      }
      .selectors select {
        display: block;
        width: 100%;
        margin-top: 7px;
      }
      .race-meta {
        margin: 0 0 24px;
        color: var(--ps-text-secondary);
        font-size: 10px;
      }
      .grid-head,
      .output-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .grid-head span,
      .output-head span {
        font: 500 8px var(--ps-font-mono);
        color: var(--ps-text-secondary);
      }
      .entries {
        margin-top: 12px;
        max-height: 470px;
        overflow: auto;
      }
      .entry {
        display: grid;
        grid-template-columns: 24px 32px 1fr auto;
        align-items: center;
        gap: 10px;
        min-height: 51px;
        border-bottom: 1px solid #eee;
      }
      .entry > b {
        font: 500 10px var(--ps-font-mono);
      }
      .avatar {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--ps-text);
        color: #fff;
        font: 600 8px var(--ps-font-mono);
      }
      .entry p {
        margin: 0;
        font-size: 11px;
      }
      .entry strong,
      .entry small {
        display: block;
      }
      .entry small {
        margin-top: 3px;
        color: var(--ps-text-secondary);
        font-size: 8px;
      }
      .entry button {
        width: 27px;
        height: 26px;
        padding: 0;
        border: 1px solid var(--ps-border-strong);
        background: var(--ps-surface);
      }
      .entry button:disabled {
        opacity: 0.3;
      }
      .run {
        margin-top: 18px;
      }
      .error {
        color: var(--ps-red);
        font-size: 10px;
      }
      .hint {
        margin: 12px 0 0;
        padding: 10px 12px;
        border-radius: 6px;
        background: var(--ps-surface-alt, rgba(127, 127, 127, 0.08));
        color: var(--ps-text-secondary);
        font-size: 10px;
        line-height: 1.5;
      }
      .state,
      .empty {
        display: grid;
        place-items: center;
        min-height: 280px;
        color: var(--ps-text-secondary);
        font-size: 10px;
      }
      .result {
        display: grid;
        grid-template-columns: 32px 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 14px 0;
        border-bottom: 1px solid var(--ps-border);
      }
      .result > span {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        color: #fff;
        font: 600 11px var(--ps-font-mono);
      }
      .result p {
        margin: 0;
      }
      .result strong,
      .result small {
        display: block;
      }
      .result small {
        margin-top: 3px;
        color: var(--ps-text-secondary);
        font-size: 9px;
      }
      .range {
        text-align: right;
      }
      .range b {
        display: block;
        font: 600 12px var(--ps-font-mono);
        color: var(--ps-red);
      }
      .range small {
        display: block;
        margin-top: 2px;
        color: var(--ps-text-muted);
        font: 500 7px var(--ps-font-mono);
        letter-spacing: 0.05em;
      }
      @media (max-width: 850px) {
        .prediction-layout {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class PredictionsComponent {
  private readonly predictions = inject(PredictionService);
  private readonly raceService = inject(RaceService);
  readonly upcomingRaces = signal<Race[]>([]);
  readonly entries = signal<PredictionContextEntry[]>([]);
  readonly results = signal<PredictionResult[]>([]);
  readonly loading = signal(false);
  readonly contextLoading = signal(false);
  readonly provisional = signal(false);
  readonly error = signal('');
  readonly modelLoaded = signal(false);
  readonly runId = signal<number | null>(null);
  readonly up = ArrowUp;
  readonly down = ArrowDown;
  readonly teamColor = colorForTeam;
  readonly flagForCountry = flagForCountry;
  selectedRaceId: number | null = null;
  private circuitName = '';
  constructor() {
    this.predictions.health().subscribe({
      next: (h) => this.modelLoaded.set(h.model_loaded),
      error: () => this.modelLoaded.set(false),
    });
    this.raceService.getUpcoming().subscribe({
      next: (races) => {
        this.upcomingRaces.set(races);
        this.selectedRaceId = races[0]?.id ?? null;
        this.loadContext();
      },
      error: () => this.error.set('Unable to load upcoming races.'),
    });
  }
  selectedRace(): Race | undefined {
    return this.upcomingRaces().find((r) => r.id === this.selectedRaceId);
  }
  loadContext() {
    const race = this.selectedRace();
    if (!race) {
      this.entries.set([]);
      return;
    }
    this.contextLoading.set(true);
    this.predictions.getContext(race.seasonYear, race.round).subscribe({
      next: (context) => {
        this.entries.set([...context.entries].sort((a, b) => a.gridPosition - b.gridPosition));
        this.provisional.set(context.provisional);
        this.circuitName = context.race.circuitName;
        this.contextLoading.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.contextLoading.set(false);
      },
    });
  }
  move(index: number, direction: number) {
    const next = index + direction;
    if (next < 0 || next >= this.entries().length) return;
    const values = [...this.entries()];
    [values[index], values[next]] = [values[next], values[index]];
    this.entries.set(values);
  }
  predict() {
    const race = this.selectedRace();
    if (!race) return;
    this.loading.set(true);
    this.error.set('');
    const entries = this.entries().map((e, i) => ({
      driverRef: e.driverRef,
      constructorRef: e.constructorRef,
      circuitName: this.circuitName,
      driverNationality: e.driverNationality,
      constructorNationality: e.constructorNationality,
      gridPosition: i + 1,
      seasonYear: race.seasonYear,
      round: race.round,
    }));
    this.predictions.predict(entries).subscribe({
      next: (response) => {
        this.results.set(response.predictions);
        this.runId.set(response.predictionRunId);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(
          e.status === 503
            ? 'Prediction model is currently unavailable.'
            : 'Prediction request failed.',
        );
        this.loading.set(false);
      },
    });
  }
  initials(name: string) {
    return name
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2);
  }
  driverName(ref: string) {
    return this.entries().find((e) => e.driverRef === ref)?.driverName ?? ref;
  }
  constructorName(ref: string) {
    return this.entries().find((e) => e.driverRef === ref)?.constructorName ?? ref;
  }
}
