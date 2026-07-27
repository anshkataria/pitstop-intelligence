import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RaceResult } from '../../core/models/race-result.model';
import { Race } from '../../core/models/race.model';
import { RaceService } from '../../core/services/race.service';
import { SeasonService } from '../../core/services/season.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { GridFinishChartComponent } from '../../shared/components/charts/grid-finish-chart.component';
import { flagForCountry } from '../../shared/utils/country-flag';
import { colorForTeam } from '../../shared/utils/team-color';

@Component({
  selector: 'app-race-analysis',
  standalone: true,
  imports: [FormsModule, IntelligenceShellComponent, GridFinishChartComponent],
  template: `<app-intelligence-shell><section class="screen">
    <header class="screen-head"><div><p class="eyebrow">ANALYSIS</p><h1>Race Review</h1><p>Grid and classification, compared from the official historical record.</p></div>
      <div class="selectors"><select class="ps-select" [(ngModel)]="season" (ngModelChange)="loadRaces()">@for(year of seasons();track year){<option [ngValue]="year">{{year}}</option>}</select>
      <select class="ps-select" [(ngModel)]="round" (ngModelChange)="loadResults()">@for(race of races();track race.id){<option [ngValue]="race.round" [disabled]="!isCompleted(race.round)">R{{race.round}} · {{race.name}}{{isCompleted(race.round)?'':' · Upcoming'}}</option>}</select></div>
    </header>
    @if(loading()){<div class="card notice">Loading race analysis…</div>}
    @else if(error()){<div class="card notice">{{error()}}</div>}
    @else if(selectedRace();as race){
      <div class="analysis-grid">
        <article class="card summary">
          <p class="eyebrow">ROUND {{race.round}}</p><h2>{{race.name}}</h2>
          <p>{{race.raceDate}} · {{race.circuitName}} · {{flagForCountry(race.country)}} {{race.country}}</p>
          @if(winner();as result){
            <div class="fact">
              <i class="dot" [style.background]="teamColor(result.constructorName)"></i>
              <p><small>RACE WINNER</small><strong>{{result.driverName}}</strong><em>{{result.constructorName}}</em></p>
              <b>{{result.points}} pts</b>
            </div>
            @if(poleSitter();as pole){
              <div class="fact">
                <i class="dot" [style.background]="teamColor(pole.constructorName)"></i>
                <p><small>POLE POSITION</small><strong>{{pole.driverName}}</strong><em>{{pole.constructorName}}</em></p>
              </div>
            }
            @if(biggestMover();as mover){
              <div class="fact">
                <i class="dot" [style.background]="teamColor(mover.constructorName)"></i>
                <p><small>BIGGEST MOVER</small><strong>{{mover.driverName}}</strong><em>Grid {{mover.gridPosition}} → P{{mover.finishPosition}}</em></p>
                <b class="gain">+{{movement(mover)}}</b>
              </div>
            }
          }
          @else if(isUpcoming()){<div class="upcoming"><span class="ps-badge ps-badge--info">Upcoming</span><p>This race hasn't been run yet — results will appear here once it's completed.</p></div>}
        </article>
        <article class="card movement"><h2>GRID TO FINISH</h2><p>Drivers above the diagonal gained track position.</p>
          <app-grid-finish-chart [results]="results()" [ariaLabel]="race.name + ' starting grid compared with final classification'" />
        </article>
        <article class="card classification"><h2>CLASSIFICATION</h2>@for(result of results();track result.id){<div class="result" [class.top3]="result.finishPosition !== null && result.finishPosition <= 3"><b>{{result.finishPosition}}</b><span [style.background]="teamColor(result.constructorName)">{{initials(result.driverName)}}</span><p><strong>{{result.driverName}}</strong><small>{{result.constructorName}} · Grid {{result.gridPosition ?? '—'}}</small></p><em>{{result.points}} pts</em></div>}@empty{<div class="notice">{{ isUpcoming() ? 'This race has not been run yet.' : 'No classification is stored for this race.' }}</div>}</article>
      </div>
    }
  </section></app-intelligence-shell>`,
  styles: [`
    .selectors{display:flex;gap:10px}.selectors select{max-width:260px}.analysis-grid{display:grid;grid-template-columns:.72fr 1.28fr;gap:18px}.analysis-grid article{padding:22px}.summary h2{margin:10px 0 6px;font-size:25px}.summary>p:not(.eyebrow){color:var(--ps-text-secondary);font-size:10px}.fact,.upcoming{display:flex;align-items:center;gap:12px;margin-top:22px;padding-top:20px;border-top:1px solid var(--ps-border)}.fact .dot{width:36px;height:36px;flex-shrink:0;border-radius:50%}.result>span{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;color:#fff;font:600 9px var(--ps-font-mono)}.fact p,.upcoming p{flex:1;margin:0;font-size:11px;color:var(--ps-text-secondary)}.fact small,.fact strong,.fact em{display:block}.fact small{color:var(--ps-red);font:600 8px var(--ps-font-mono);letter-spacing:.03em}.fact strong{margin-top:5px;color:var(--ps-text)}.fact em,.result small{color:var(--ps-text-secondary);font-size:9px;font-style:normal}.fact b{font:500 11px var(--ps-font-mono);white-space:nowrap}.fact b.gain{color:var(--ps-green)}.movement>p{color:var(--ps-text-secondary);font-size:10px}.classification{grid-column:1/3}.result{display:grid;grid-template-columns:26px 36px 1fr auto;align-items:center;gap:11px;min-height:55px;border-bottom:1px solid var(--ps-border)}.result.top3>b{color:var(--ps-red)}.result>b,.result>em{font:500 10px var(--ps-font-mono);font-style:normal}.result p{margin:0}.result strong,.result small{display:block}.notice{display:grid;place-items:center;min-height:260px;color:var(--ps-text-secondary);font-size:11px;text-align:center}@media(max-width:800px){.analysis-grid{grid-template-columns:1fr}.classification{grid-column:auto}.selectors{flex-direction:column}}
  `],
})
export class RaceAnalysisComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seasonsService = inject(SeasonService);
  private readonly raceService = inject(RaceService);
  readonly seasons = signal<number[]>([]);
  readonly races = signal<Race[]>([]);
  readonly results = signal<RaceResult[]>([]);
  readonly completedRounds = signal<Set<number>>(new Set());
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selectedRace = computed(() => this.races().find((race) => race.round === this.round) ?? null);
  readonly winner = computed(() => this.results().find((result) => result.finishPosition === 1) ?? null);
  readonly poleSitter = computed(() => {
    const pole = this.results().find((result) => result.gridPosition === 1);
    return pole && pole.finishPosition !== 1 ? pole : null;
  });
  readonly biggestMover = computed(() => {
    const candidates = this.results().filter((r) => r.gridPosition != null && r.finishPosition != null);
    if (!candidates.length) return null;
    const best = candidates.reduce((a, b) => (this.movement(b) > this.movement(a) ? b : a));
    return this.movement(best) > 0 ? best : null;
  });
  readonly isUpcoming = computed(() => !this.completedRounds().has(this.round));
  readonly flagForCountry = flagForCountry;
  readonly teamColor = colorForTeam;
  season = 2024;
  round = 1;

  constructor() {
    const requestedSeason = Number(this.route.snapshot.queryParamMap.get('season'));
    const requestedRound = Number(this.route.snapshot.queryParamMap.get('round'));
    this.seasonsService.getAll().subscribe({
      next: (years) => {
        this.seasons.set(years);
        this.season = years.includes(requestedSeason) ? requestedSeason : (years[0] ?? this.season);
        this.round = requestedRound || this.round;
        this.loadRaces(Boolean(requestedRound));
      },
      error: () => this.loadRaces(false),
    });
  }

  loadRaces(preserveRound = false): void {
    this.loading.set(true); this.error.set('');
    forkJoin({
      races: this.raceService.getBySeason(this.season),
      seasonResults: this.raceService.getSeasonResults(this.season),
    }).subscribe({
      next: ({ races, seasonResults }) => {
        this.races.set(races);
        const completed = new Set(seasonResults.map((result) => result.round));
        this.completedRounds.set(completed);
        if (!preserveRound || !races.some((r) => r.round === this.round)) {
          const lastCompleted = [...completed].filter((r) => races.some((race) => race.round === r)).sort((a, b) => b - a)[0];
          this.round = lastCompleted ?? races[0]?.round ?? 1;
        }
        this.loadResults();
      },
      error: () => { this.error.set('Unable to load races for this season.'); this.loading.set(false); },
    });
  }

  loadResults(): void {
    this.loading.set(true); this.results.set([]); this.error.set('');
    this.raceService.getResultsBySeasonAndRound(this.season, this.round).subscribe({
      next: (results) => { this.results.set(results); this.loading.set(false); },
      error: () => { this.error.set('Unable to load this race classification.'); this.loading.set(false); },
    });
  }

  isCompleted(round: number): boolean {
    return this.completedRounds().has(round);
  }

  movement(result: RaceResult): number {
    return (result.gridPosition ?? 0) - (result.finishPosition ?? 0);
  }

  initials(name: string): string { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
}
