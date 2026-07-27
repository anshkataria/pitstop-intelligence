import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConstructorStanding } from '../../core/models/constructor.model';
import { ConstructorService } from '../../core/services/constructor.service';
import { SeasonService } from '../../core/services/season.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [FormsModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell><section class="screen">
    <header class="screen-head"><div><p class="eyebrow">CONSTRUCTORS</p><h1>Team Standings</h1><p>Championship position, points and race conversion.</p></div>
      <select [(ngModel)]="season" (ngModelChange)="loadStandings()">@for(year of seasons();track year){<option [ngValue]="year">{{year}} Season</option>}</select>
    </header>
    @if(loading()){<div class="card state">Loading team standings…</div>}
    @else if(error()){<div class="card state">{{error()}}</div>}
    @else{<div class="standings">@for(team of standings();track team.constructorId){
      <article class="card team"><span class="position">{{team.position}}</span><div class="identity"><small>{{team.nationality}}</small><h2>{{team.constructorName}}</h2><p>{{team.constructorRef.toUpperCase()}}</p></div><div class="stat"><strong>{{team.points}}</strong><small>POINTS</small></div><div class="stat"><strong>{{team.wins}}</strong><small>WINS</small></div><div class="stat"><strong>{{team.podiums}}</strong><small>PODIUMS</small></div><div class="stat"><strong>{{team.racesEntered}}</strong><small>RACES</small></div>
      </article>}@empty{<div class="card state">No team results are available for {{season}}.</div>}</div>}
  </section></app-intelligence-shell>`,
  styles: [`
    .screen-head select{min-width:150px;height:44px;padding:0 14px;border:1px solid var(--ps-border-strong);border-radius:var(--ps-radius-input);background:var(--ps-surface)}.standings{display:grid;gap:10px}.team{display:grid;grid-template-columns:48px minmax(210px,1fr) repeat(4,110px);align-items:center;min-height:92px;padding:15px 22px}.team:nth-child(-n+3) .position{color:var(--ps-red)}.position{font:500 22px var(--ps-font-mono);color:var(--ps-text-muted)}.identity{border-left:1px solid var(--ps-border);padding-left:20px}.identity small,.identity p,.stat small{color:var(--ps-text-secondary);font:500 8px var(--ps-font-mono);letter-spacing:.06em}.identity h2{margin:5px 0 3px;font-size:17px}.identity p{margin:0}.stat{display:flex;flex-direction:column;gap:5px}.stat strong{font:500 19px var(--ps-font-mono)}.state{padding:60px;text-align:center;color:var(--ps-text-secondary)}@media(max-width:900px){.team{grid-template-columns:40px 1fr repeat(2,80px)}.stat:nth-last-child(-n+2){display:none}}@media(max-width:600px){.team{grid-template-columns:32px 1fr 72px}.stat{display:none}.stat:nth-of-type(3){display:flex}}
  `],
})
export class TeamListComponent {
  private readonly constructors = inject(ConstructorService);
  private readonly seasonService = inject(SeasonService);
  readonly seasons = signal<number[]>([]);
  readonly standings = signal<ConstructorStanding[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
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
