import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RaceService } from '../../core/services/race.service';
import { Race } from '../../core/models/race.model';
import { RaceResult } from '../../core/models/race-result.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { flagForCountry } from '../../shared/utils/country-flag';
import { colorForTeam } from '../../shared/utils/team-color';

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
            <p class="eyebrow">
              ROUND {{ r.round }} · {{ r.seasonYear }}
              @if (isUpcoming()) {
                <span class="ps-badge ps-badge--neutral upcoming-badge">Upcoming</span>
              }
            </p>
            <h1>{{ r.name }}</h1>
            <p>{{ r.raceDate }} &nbsp;·&nbsp; {{ r.circuitName }} &nbsp;·&nbsp; {{ flagForCountry(r.country) }} {{ r.country }}</p>
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
                <dt>Circuit</dt>
                <dd class="circuit-name">{{ r.circuitName }}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{{ flagForCountry(r.country) }} {{ r.country }}</dd>
              </div>
              <div>
                <dt>Race date</dt>
                <dd class="circuit-name">{{ r.raceDate }}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd class="circuit-name">{{ isUpcoming() ? 'Upcoming' : 'Completed' }}</dd>
              </div>
            </dl>
            @if (winner(); as w) {
              <div class="winner">
                <small>WINNER</small>
                <div class="winner-line">
                  <i class="dot" [style.background]="teamColor(w.constructorName)"></i>
                  <strong>{{ w.driverName }}</strong>
                </div>
                <span>{{ w.constructorName }}</span>
              </div>
            } @else if (isUpcoming()) {
              <div class="winner upcoming-note">
                <p>This race hasn't been run yet — results will appear here once it's completed.</p>
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
              <div class="notice">{{ isUpcoming() ? 'This race has not been run yet.' : 'No classification is stored for this race.' }}</div>
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
      .upcoming-badge {
        margin-left: 8px;
        vertical-align: middle;
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
      .winner small {
        display: block;
        color: var(--ps-red);
        font: 600 9px var(--ps-font-mono);
        letter-spacing: 0.05em;
      }
      .winner-line {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
      .winner-line .dot {
        width: 10px;
        height: 10px;
        flex-shrink: 0;
        border-radius: 50%;
      }
      .winner-line strong {
        font-size: 18px;
      }
      .winner > span {
        display: block;
        margin: 3px 0 0 18px;
        color: var(--ps-text-secondary);
        font-size: 12px;
      }
      .upcoming-note p {
        margin: 0;
        color: var(--ps-text-secondary);
        font-size: 12px;
        line-height: 1.6;
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
  readonly isUpcoming = computed(() => this.race() !== null && this.results().length === 0);
  readonly flagForCountry = flagForCountry;
  readonly teamColor = colorForTeam;
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
