import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConstructorStanding } from '../../core/models/constructor.model';
import { ConstructorService } from '../../core/services/constructor.service';
import { SeasonService } from '../../core/services/season.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { flagFor } from '../../shared/utils/nationality-flag';
import { colorForTeam } from '../../shared/utils/team-color';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [FormsModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell><section class="screen">
    <header class="screen-head"><div><p class="eyebrow">CONSTRUCTORS</p><h1>Team Standings</h1><p>Championship position, points and race conversion.</p></div>
      <select class="ps-select" [(ngModel)]="season" (ngModelChange)="loadStandings()">@for(year of seasons();track year){<option [ngValue]="year">{{year}} Season</option>}</select>
    </header>
    @if(loading()){<div class="card state">Loading team standings…</div>}
    @else if(error()){<div class="card state">{{error()}}</div>}
    @else{<div class="standings">@for(team of standings();track team.constructorId){
      <article class="card team" [class.leader]="team.position===1">
        <div class="team-top">
          <span class="position">{{team.position}}</span>
          <i class="dot" [style.background]="teamColor(team.constructorName)"></i>
          <div class="identity"><h2>{{team.constructorName}}</h2><p>{{flagFor(team.nationality)}} {{team.nationality}}</p></div>
          <div class="stat"><strong>{{team.points}}</strong><small>POINTS</small></div>
          <div class="stat"><strong>{{team.wins}}</strong><small>WINS</small></div>
          <div class="stat"><strong>{{team.podiums}}</strong><small>PODIUMS</small></div>
          <div class="stat"><strong>{{team.racesEntered}}</strong><small>RACES</small></div>
        </div>
        <div class="bar-track"><div class="bar-fill" [style.width.%]="(team.points/maxPoints())*100" [style.background]="teamColor(team.constructorName)"></div></div>
      </article>}@empty{<div class="card state">No team results are available for {{season}}.</div>}</div>}
  </section></app-intelligence-shell>`,
  styles: [`
    .screen-head select{min-width:170px}.standings{display:grid;gap:10px}.team{padding:18px 22px}.team.leader{border-left:3px solid var(--ps-red)}.team-top{display:grid;grid-template-columns:30px 10px minmax(180px,1fr) repeat(4,90px);align-items:center;gap:16px}.team:nth-child(-n+3) .position{color:var(--ps-red)}.position{font:500 22px var(--ps-font-mono);color:var(--ps-text-muted)}.dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.identity h2{margin:0;font-size:17px}.identity p{margin:5px 0 0;color:var(--ps-text-secondary);font-size:11px}.stat{display:flex;flex-direction:column;gap:5px}.stat small{color:var(--ps-text-secondary);font:500 8px var(--ps-font-mono);letter-spacing:.06em}.stat strong{font:500 19px var(--ps-font-mono)}.bar-track{height:6px;margin-top:16px;border-radius:3px;background:var(--ps-bg);overflow:hidden}.bar-fill{height:100%;min-width:3px;border-radius:3px}.state{padding:60px;text-align:center;color:var(--ps-text-secondary)}@media(max-width:900px){.team-top{grid-template-columns:26px 8px 1fr repeat(2,80px)}.stat:nth-last-child(-n+2){display:none}}@media(max-width:600px){.team-top{grid-template-columns:22px 8px 1fr 72px}.stat{display:none}.stat:nth-of-type(3){display:flex}}
  `],
})
export class TeamListComponent {
  private readonly constructors = inject(ConstructorService);
  private readonly seasonService = inject(SeasonService);
  readonly seasons = signal<number[]>([]);
  readonly standings = signal<ConstructorStanding[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly maxPoints = computed(() => Math.max(1, ...this.standings().map((t) => t.points)));
  readonly flagFor = flagFor;
  readonly teamColor = colorForTeam;
  season = 2024;

  constructor() {
    this.seasonService.getAll().subscribe({
      next: (years) => { this.seasons.set(years); this.season = years[0] ?? this.season; this.loadStandings(); },
      error: () => this.loadStandings(),
    });
  }

  loadStandings(): void {
    this.loading.set(true); this.error.set('');
    this.constructors.getStandings(this.season).subscribe({
      next: (standings) => { this.standings.set(standings); this.loading.set(false); },
      error: () => { this.error.set('Unable to load team standings.'); this.loading.set(false); },
    });
  }
}
