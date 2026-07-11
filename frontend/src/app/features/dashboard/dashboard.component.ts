import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, House, CalendarDays, ChartNoAxesCombined, Target, UserRound } from 'lucide-angular';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <a routerLink="/" class="brand"><img src="/images/pitstop-logo-dark.svg" alt="Pitstop Intelligence"></a>
        <nav class="menu">
          @for (item of menu; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active"><lucide-icon [img]="item.icon" [size]="19" [strokeWidth]="1.6" /> <span>{{ item.label }}</span></a>
          }
        </nav>
      </aside>

      <main class="workspace">
        <header class="race-header">
          <div><div class="live-label"><i></i> LIVE</div><h1>Australian Grand Prix</h1><p>Albert Park Circuit <b>·</b> 58 Laps <b>·</b> Dry <b>·</b> Updated 2 min ago</p></div>
          <div class="header-actions"><button>2024 Season <span>⌄</span></button><button><i></i> Live</button></div>
        </header>

        <section class="metrics">
          @for (m of metrics; track m.label) {
            <article><label>{{ m.label }}</label><strong>{{ m.value }} <small>{{ m.unit }}</small></strong>@if(m.badge){<em>{{m.badge}}</em>}</article>
          }
        </section>

        <section class="content-grid">
          <article class="card outcome">
            <h2>RACE OUTCOME PREDICTION</h2>
            <div class="drivers">
              @for (d of drivers; track d.name) {
                <div class="driver"><b>{{d.rank}}</b><span class="driver__avatar" [style.--accent]="d.color">{{d.initials}}</span><p>{{d.name}}<small>{{d.team}}</small></p><strong>{{d.percent}}%</strong></div>
              }
            </div>
            <div class="confidence"><span>Model confidence</span><i><b></b></i><strong>82%</strong></div>
          </article>

          <article class="card pit-window">
            <h2>PREDICTED PIT STOP WINDOW</h2><div class="pit-title"><small>LAP</small><strong>33 - 36</strong></div><p>Medium Tyre<small>High confidence</small></p>
            <div class="pit-chart"><div class="pit-band"></div><div class="y-labels"><span>60%</span><span>40%</span><span>20%</span></div><svg viewBox="0 0 310 150" preserveAspectRatio="none"><polyline class="muted" points="0,138 35,136 70,137 105,132 140,134 175,128 210,127 245,118 280,114 310,108"/><polyline points="0,130 18,123 35,116 52,110 70,93 88,86 105,72 123,63 140,65 158,70 175,60 193,58 210,50 228,44 245,36 263,15 280,10 298,3 310,0"/></svg><div class="x-labels"><span>28</span><span>30</span><span>32</span><span>34</span><span>36</span><span>38</span><span>40</span></div><footer>Laps</footer></div>
          </article>

          <aside class="insight-column">
            <article class="card insight"><h2>STRATEGY INSIGHT</h2><p>Two stop strategy is predicted to be <strong>3.2s faster</strong> than current one stop strategy.</p><button>View Simulation</button></article>
            <article class="card safety"><h2>SAFETY CAR PROBABILITY</h2><div class="probability">23<small>%</small></div><p>Medium</p><span>Main factors</span><ul><li>Tight circuit</li><li>Historical data</li><li>Weather stable</li></ul><svg viewBox="0 0 220 76" preserveAspectRatio="none"><polyline points="0,5 7,66 22,49 38,58 56,64 73,55 90,59 106,41 123,32 140,38 158,50 176,55 194,43 220,9"/></svg></article>
          </aside>

          <article class="card graph"><h2>DRIVER PACE COMPARISON</h2><p>Gap to Leader (s)</p><div class="legend"><span class="nor">● NOR</span><span class="ver">● VER</span><span class="lec">● LEC</span></div><div class="line-chart"><div class="axis-y"><span>-10</span><span>-5</span><span>0</span><span>-5</span><span>-10</span></div><svg viewBox="0 0 500 170" preserveAspectRatio="none"><polyline class="nor" points="0,120 25,80 50,94 80,75 110,69 150,72 185,63 220,66 255,47 290,53 325,47 360,57 395,40 430,48 465,38 500,44"/><polyline class="ver" points="0,110 25,145 50,102 80,112 110,79 150,89 185,64 220,54 255,61 290,44 325,30 360,43 395,23 430,36 465,18 500,28"/><polyline class="lec" points="0,116 25,91 50,87 80,70 110,73 150,60 185,77 220,72 255,83 290,76 325,80 360,68 395,83 430,70 465,80 500,75"/></svg><div class="axis-x"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>58</span></div><footer>Laps</footer></div></article>

          <article class="card graph"><h2>TYRE DEGRADATION</h2><p>Average lap time (s)</p><div class="legend"><span class="nor">● NOR</span><span class="ver">● VER</span><span class="lec">● LEC</span></div><div class="line-chart"><div class="axis-y"><span>1:20</span><span>1:18</span><span>1:16</span><span>1:14</span></div><svg viewBox="0 0 500 170" preserveAspectRatio="none"><polyline class="nor" points="0,140 40,119 80,107 120,114 160,89 200,103 240,79 280,69 320,75 360,54 400,61 450,44 500,49"/><polyline class="ver" points="0,145 40,108 80,98 120,83 160,70 200,58 240,48 280,53 320,38 360,46 400,28 450,36 500,18"/><polyline class="lec" points="0,144 40,111 80,119 120,99 160,93 200,91 240,85 280,91 320,74 360,81 400,67 450,77 500,62"/></svg><div class="axis-x"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>58</span></div><footer>Laps</footer></div></article>
        </section>
      </main>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly menu = [
    { icon: House, label: 'Overview', path: '/dashboard' },
    { icon: CalendarDays, label: 'Races', path: '/races' },
    { icon: ChartNoAxesCombined, label: 'Race Analysis', path: '/race-analysis' },
    { icon: Target, label: 'Predictions', path: '/predictions' },
    { icon: UserRound, label: 'Drivers', path: '/drivers' },
  ];
  readonly metrics = [
    { label: 'LAP', value: '32 /', unit: '58', badge: '' }, { label: 'AIR TEMP', value: '24.4', unit: '°C', badge: '' },
    { label: 'TRACK TEMP', value: '32.1', unit: '°C', badge: '' }, { label: 'HUMIDITY', value: '46', unit: '%', badge: '' },
    { label: 'WIND', value: '12', unit: 'km/h', badge: 'NW' },
  ];
  readonly drivers = [
    { rank: 1, initials: 'LN', name: 'Lando Norris', team: 'McLaren', percent: 68, color: '#ff8700' },
    { rank: 2, initials: 'MV', name: 'Max Verstappen', team: 'Red Bull', percent: 18, color: '#42688a' },
    { rank: 3, initials: 'CL', name: 'Charles Leclerc', team: 'Ferrari', percent: 7, color: '#d92332' },
    { rank: 4, initials: 'OP', name: 'Oscar Piastri', team: 'McLaren', percent: 5, color: '#ff8700' },
    { rank: 5, initials: 'CS', name: 'Carlos Sainz', team: 'Ferrari', percent: 2, color: '#d92332' },
  ];
}
