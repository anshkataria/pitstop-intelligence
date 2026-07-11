import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RaceService } from '../../core/services/race.service';
import { Race } from '../../core/models/race.model';
import { RaceResult } from '../../core/models/race-result.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-race-detail',
  standalone: true,
  imports: [RouterLink, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      @if (race(); as r) {
        <a routerLink="/races" class="back">← Race calendar</a>
        <header class="screen-head">
          <div>
            <p class="eyebrow">ROUND {{ r.round }} · {{ r.seasonYear }}</p>
            <h1>{{ r.name }}</h1>
            <p>{{ r.raceDate }} &nbsp;·&nbsp; {{ r.circuitName }} &nbsp;·&nbsp; {{ r.country }}</p>
          </div>
          <a
            [routerLink]="['/race-analysis']"
            [queryParams]="{ season: r.seasonYear, round: r.round }"
            class="btn-primary"
            >Open analysis</a
          >
        </header>
        <div class="detail-grid">
          <article class="card circuit">
            <h2>Circuit overview</h2>
            <div class="circuit-map"><i></i><i></i><i></i><i></i><i></i></div>
            <dl>
              <div>
                <dt>Season</dt>
                <dd>{{ r.seasonYear }}</dd>
              </div>
              <div>
                <dt>Round</dt>
                <dd>{{ r.round }}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{{ r.country }}</dd>
              </div>
            </dl>
          </article>
          <article class="card">
            <h2>Race classification</h2>
            @if (results().length) {
              <div class="classification">
                @for (result of results(); track result.id) {
                  <div>
                    <b>{{ result.finishPosition }}</b>
                    <p>
                      <strong>{{ result.driverName }}</strong
                      ><small>{{ result.constructorName }}</small>
                    </p>
                    <span>{{ result.points }} pts</span>
                  </div>
                }
              </div>
            } @else {
              <div class="notice">Classification not available for this race.</div>
            }
          </article>
        </div>
      } @else if (error()) {
        <div class="card notice">{{ error() }}</div>
      } @else {
        <div class="card notice">Loading race…</div>
      }
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .back {
        display: block;
        margin-bottom: 20px;
        color: #333;
        text-decoration: none;
        font-size: 12px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
      }
      .detail-grid article {
        padding: 22px;
      }
      .circuit-map {
        height: 260px;
        position: relative;
        margin: 20px 0;
        background: #f4f3ef;
        border-radius: 8px;
        overflow: hidden;
      }
      .circuit-map:before {
        content: '';
        position: absolute;
        inset: 55px 80px;
        border: 6px solid #42688a;
        border-radius: 45% 20% 55% 25%;
        transform: rotate(-8deg);
      }
      .circuit-map i {
        position: absolute;
        width: 14px;
        height: 14px;
        border: 3px solid #d92332;
        background: #fff;
        border-radius: 50%;
      }
      .circuit-map i:nth-child(1) {
        left: 20%;
        top: 45%;
      }
      .circuit-map i:nth-child(2) {
        left: 45%;
        top: 26%;
      }
      .circuit-map i:nth-child(3) {
        right: 20%;
        top: 50%;
      }
      .circuit-map i:nth-child(4) {
        left: 50%;
        bottom: 25%;
      }
      .circuit-map i:nth-child(5) {
        right: 34%;
        top: 34%;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }
      dt {
        font-size: 9px;
        color: #777;
      }
      dd {
        margin: 6px 0;
        font: 500 14px var(--ps-font-mono);
      }
      .notice {
        display: grid;
        place-items: center;
        min-height: 300px;
        color: #777;
        font-size: 11px;
        text-align: center;
      }
      .classification {
        margin-top: 16px;
      }
      .classification > div {
        display: grid;
        grid-template-columns: 25px 1fr auto;
        align-items: center;
        gap: 10px;
        min-height: 48px;
        border-bottom: 1px solid #eee;
      }
      .classification b,
      .classification span {
        font: 500 10px var(--ps-font-mono);
      }
      .classification p {
        margin: 0;
        font-size: 11px;
      }
      .classification strong,
      .classification small {
        display: block;
      }
      .classification small {
        margin-top: 3px;
        color: #777;
        font-size: 8px;
      }
      @media (max-width: 760px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RaceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(RaceService);
  readonly race = signal<Race | null>(null);
  readonly results = signal<RaceResult[]>([]);
  readonly error = signal('');
  ngOnInit() {
    const year = Number(this.route.snapshot.paramMap.get('year'));
    const round = Number(this.route.snapshot.paramMap.get('round'));
    this.service.getBySeasonAndRound(year, round).subscribe({
      next: (r) => this.race.set(r),
      error: () => this.error.set('Unable to load this race.'),
    });
    this.service
      .getResultsBySeasonAndRound(year, round)
      .subscribe({ next: (results) => this.results.set(results) });
  }
}
