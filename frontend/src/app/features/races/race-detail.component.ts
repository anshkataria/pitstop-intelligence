import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
            <h2>Race info</h2>
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
              <div>
                <dt>Circuit</dt>
                <dd class="circuit-name">{{ r.circuitName }}</dd>
              </div>
            </dl>
            @if (winner(); as w) {
              <div class="winner">
                <small>WINNER</small>
                <strong>{{ w.driverName }}</strong>
                <span>{{ w.constructorName }}</span>
              </div>
            }
          </article>
          <article class="card">
            <h2>Race classification</h2>
            @if (results().length) {
              <div class="classification">
                @for (result of results(); track result.id) {
                  <div [class.top3]="result.finishPosition !== null && result.finishPosition <= 3">
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
        color: var(--ps-text-secondary);
        text-decoration: none;
        font-size: 12px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 0.8fr 1.2fr;
        gap: 18px;
        align-items: start;
      }
      .detail-grid article {
        padding: 22px;
      }
      dl {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px 0;
        margin-top: 16px;
      }
      dt {
        font: 600 9px var(--ps-font-mono);
        color: var(--ps-text-muted);
        letter-spacing: 0.05em;
      }
      dd {
        margin: 6px 0 0;
        font: 500 15px var(--ps-font-mono);
      }
      .circuit-name {
        font-size: 13px;
      }
      .winner {
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1px solid var(--ps-border);
      }
      .winner small,
      .winner strong,
      .winner span {
        display: block;
      }
      .winner small {
        color: var(--ps-red);
        font: 600 9px var(--ps-font-mono);
        letter-spacing: 0.05em;
      }
      .winner strong {
        margin-top: 6px;
        font-size: 18px;
      }
      .winner span {
        margin-top: 3px;
        color: var(--ps-text-secondary);
        font-size: 12px;
      }
      .notice {
        display: grid;
        place-items: center;
        min-height: 300px;
        color: var(--ps-text-secondary);
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
        border-bottom: 1px solid var(--ps-border);
      }
      .classification > div.top3 > b {
        color: var(--ps-red);
      }
      .classification b,
      .classification span {
        font: 500 11px var(--ps-font-mono);
      }
      .classification p {
        margin: 0;
        font-size: 12px;
      }
      .classification strong,
      .classification small {
        display: block;
      }
      .classification small {
        margin-top: 3px;
        color: var(--ps-text-secondary);
        font-size: 10px;
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
  readonly winner = computed(() => this.results().find((r) => r.finishPosition === 1) ?? null);
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
