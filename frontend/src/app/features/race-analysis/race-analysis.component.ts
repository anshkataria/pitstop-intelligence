import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { SeasonService } from '../../core/services/season.service';

@Component({
  selector: 'app-race-analysis',
  standalone: true,
  imports: [FormsModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">ANALYSIS</p>
          <h1>Race Review</h1>
          <p>Grid, result and pace—side by side.</p>
        </div>
        <div class="selectors">
          <select [(ngModel)]="season">
            @for (year of seasons(); track year) {
              <option [ngValue]="year">{{ year }}</option>
            }</select
          ><select>
            <option>Bahrain Grand Prix</option>
            <option>Australian Grand Prix</option>
          </select>
        </div>
      </header>
      <nav class="tabs">
        <a class="active">Overview</a><a>Laps</a><a>Segments</a><a>Strategy</a>
      </nav>
      <div class="analysis-grid">
        <article class="card track">
          <h2>Bahrain Grand Prix</h2>
          <p>21 Apr, 2024 · Bahrain International Circuit</p>
          <div class="map">
            <span class="m1"></span><span class="m2"></span><span class="m3"></span
            ><span class="m4"></span>
          </div>
        </article>
        <article class="card winner">
          <p class="eyebrow">RACE WINNER</p>
          <div>
            <span class="avatar">MV</span>
            <p><strong>Max Verstappen</strong><small>Red Bull Racing</small></p>
            <b>1:31:44.742</b>
          </div>
        </article>
        <article class="card results">
          <h2>Classification</h2>
          <div class="notice">No classification data for this race.</div>
        </article>
      </div>
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .selectors {
        display: flex;
        gap: 10px;
      }
      .selectors select {
        height: 42px;
        padding: 0 13px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: #fff;
      }
      .tabs {
        display: flex;
        gap: 34px;
        border-bottom: 1px solid #ddd;
      }
      .tabs a {
        padding: 15px 0;
        font-size: 11px;
      }
      .tabs .active {
        color: #d92332;
        border-bottom: 2px solid #d92332;
      }
      .analysis-grid {
        display: grid;
        grid-template-columns: 1.4fr 0.6fr;
        gap: 18px;
        margin-top: 18px;
      }
      .analysis-grid article {
        padding: 22px;
      }
      .track {
        grid-column: 1;
      }
      .map {
        height: 330px;
        position: relative;
        margin-top: 25px;
        background: linear-gradient(145deg, #eee, #fafafa);
        overflow: hidden;
      }
      .map:before {
        content: '';
        position: absolute;
        inset: 70px 90px;
        border: 7px solid #42688a;
        border-left-color: #2d7d5b;
        border-radius: 50% 20% 45% 30%;
        transform: rotate(-8deg);
      }
      .map span {
        position: absolute;
        width: 16px;
        height: 16px;
        border: 4px solid #d92332;
        background: #fff;
        border-radius: 50%;
      }
      .m1 {
        left: 26%;
        top: 48%;
      }
      .m2 {
        left: 47%;
        top: 24%;
      }
      .m3 {
        right: 22%;
        top: 49%;
      }
      .m4 {
        left: 55%;
        bottom: 24%;
      }
      .winner > div {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 25px;
      }
      .winner .avatar {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #151515;
        color: #fff;
      }
      .winner p {
        flex: 1;
      }
      .winner small,
      .winner strong {
        display: block;
      }
      .winner b {
        font: 500 11px var(--ps-font-mono);
      }
      .results {
        grid-column: 1/3;
      }
      .notice {
        display: grid;
        place-items: center;
        height: 140px;
        color: #777;
        font-size: 11px;
      }
      .notice span {
        font-family: var(--ps-font-mono);
      }
      @media (max-width: 800px) {
        .analysis-grid {
          grid-template-columns: 1fr;
        }
        .track,
        .results {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class RaceAnalysisComponent {
  private readonly seasonService = inject(SeasonService);
  readonly seasons = signal<number[]>([]);
  season = 2024;

  constructor() {
    this.seasonService.getAll().subscribe({
      next: (years) => {
        this.seasons.set(years);
        this.season = years[0] ?? this.season;
      },
    });
  }
}
