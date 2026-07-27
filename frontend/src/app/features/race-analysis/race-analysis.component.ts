import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RaceResult } from '../../core/models/race-result.model';
import { Race } from '../../core/models/race.model';
import { RaceService } from '../../core/services/race.service';
import { SeasonService } from '../../core/services/season.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { GridFinishChartComponent } from '../../shared/components/charts/grid-finish-chart.component';

@Component({
  selector: 'app-race-analysis',
  standalone: true,
  imports: [FormsModule, IntelligenceShellComponent, GridFinishChartComponent],
  template: `<app-intelligence-shell><section class="screen">
    <header class="screen-head"><div><p class="eyebrow">ANALYSIS</p><h1>Race Review</h1><p>Grid and classification, compared from the official historical record.</p></div>
      <div class="selectors"><select [(ngModel)]="season" (ngModelChange)="loadRaces()">@for(year of seasons();track year){<option [ngValue]="year">{{year}}</option>}</select>
      <select [(ngModel)]="round" (ngModelChange)="loadResults()">@for(race of races();track race.id){<option [ngValue]="race.round">R{{race.round}} · {{race.name}}</option>}</select></div>
    </header>
    @if(loading()){<div class="card notice">Loading race analysis…</div>}
    @else if(error()){<div class="card notice">{{error()}}</div>}
    @else if(selectedRace();as race){
      <div class="analysis-grid">
        <article class="card summary"><p class="eyebrow">ROUND {{race.round}}</p><h2>{{race.name}}</h2><p>{{race.raceDate}} · {{race.circuitName}} · {{race.country}}</p>
          @if(winner();as result){<div class="winner"><span>{{initials(result.driverName)}}</span><p><small>RACE WINNER</small><strong>{{result.driverName}}</strong><em>{{result.constructorName}}</em></p><b>{{result.points}} pts</b></div>}
        </article>
        <article class="card movement"><h2>GRID TO FINISH</h2><p>Drivers above the diagonal gained track position.</p>
          <app-grid-finish-chart [results]="results()" [ariaLabel]="race.name + ' starting grid compared with final classification'" />
        </article>
        <article class="card classification"><h2>CLASSIFICATION</h2>@for(result of results();track result.id){<div class="result"><b>{{result.finishPosition}}</b><span>{{initials(result.driverName)}}</span><p><strong>{{result.driverName}}</strong><small>{{result.constructorName}} · Grid {{result.gridPosition ?? '—'}}</small></p><em>{{result.points}} pts</em></div>}@empty{<div class="notice">No classification is stored for this race.</div>}</article>
      </div>
    }
  </section></app-intelligence-shell>`,
  styles: [`
    .selectors{display:flex;gap:10px}.selectors select{height:42px;max-width:260px;padding:0 13px;border:1px solid var(--ps-border-strong);border-radius:var(--ps-radius-input);background:var(--ps-surface)}.analysis-grid{display:grid;grid-template-columns:.72fr 1.28fr;gap:18px}.analysis-grid article{padding:22px}.summary h2{margin:10px 0 6px;font-size:25px}.summary>p:not(.eyebrow){color:var(--ps-text-secondary);font-size:10px}.winner{display:flex;align-items:center;gap:12px;margin-top:34px;padding-top:20px;border-top:1px solid var(--ps-border)}.winner>span,.result>span{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--ps-text);color:#fff;font:600 9px var(--ps-font-mono)}.winner p{flex:1;margin:0}.winner small,.winner strong,.winner em{display:block}.winner small{color:var(--ps-red);font:600 8px var(--ps-font-mono)}.winner strong{margin-top:5px}.winner em,.result small{color:var(--ps-text-secondary);font-size:9px;font-style:normal}.winner b{font:500 11px var(--ps-font-mono)}.movement>p{color:var(--ps-text-secondary);font-size:10px}.movement-list{margin-top:22px}.movement-list div{display:grid;grid-template-columns:42px 1fr 34px;align-items:center;gap:10px;margin:11px 0;font:500 9px var(--ps-font-mono)}.movement-list i{height:4px;background:var(--ps-border-strong)}.movement-list i b{display:block;height:100%;background:var(--ps-green)}.movement-list i b.loss{background:var(--ps-red)}.movement-list strong{color:var(--ps-green)}.movement-list strong.negative{color:var(--ps-red)}.classification{grid-column:1/3}.result{display:grid;grid-template-columns:26px 36px 1fr auto;align-items:center;gap:11px;min-height:55px;border-bottom:1px solid var(--ps-border)}.result>b,.result>em{font:500 10px var(--ps-font-mono);font-style:normal}.result p{margin:0}.result strong,.result small{display:block}.notice{display:grid;place-items:center;min-height:260px;color:var(--ps-text-secondary);font-size:11px}@media(max-width:800px){.analysis-grid{grid-template-columns:1fr}.classification{grid-column:auto}.selectors{flex-direction:column}}
  `],
})
export class RaceAnalysisComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seasonsService = inject(SeasonService);
  private readonly raceService = inject(RaceService);
  readonly seasons = signal<number[]>([]);
  readonly races = signal<Race[]>([]);
  readonly results = signal<RaceResult[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selectedRace = computed(() => this.races().find((race) => race.round === this.round) ?? null);
  readonly winner = computed(() => this.results().find((result) => result.finishPosition === 1) ?? null);
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
        this.loadRaces(true);
      },
      error: () => this.loadRaces(true),
    });
  }

  loadRaces(preserveRound = false): void {
    this.loading.set(true); this.error.set('');
    this.raceService.getBySeason(this.season).subscribe({
      next: (races) => { this.races.set(races); if (!preserveRound || !races.some((r) => r.round === this.round)) this.round = races[0]?.round ?? 1; this.loadResults(); },
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

  initials(name: string): string { return name.split(' ').map((part) => part[0]).join('').slice(0, 2); }
}
