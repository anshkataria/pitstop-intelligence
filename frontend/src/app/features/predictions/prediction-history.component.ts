import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { PredictionEvaluation, PredictionEvaluationResult, PredictionRunDetail, PredictionRunSummary } from '../../core/models/prediction.model';
import { PredictionService } from '../../core/services/prediction.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-prediction-history',
  standalone: true,
  imports: [DatePipe, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">MODEL ARCHIVE</p>
          <h1>Prediction History</h1>
          <p>Every stored forecast, model version and confidence range.</p>
        </div>
      </header>
      <div class="layout">
        <article class="card runs">
          <div class="card-head"><div><h2>RECENT RUNS</h2><p>{{ runs().length }} stored forecasts</p></div></div>
          @if (loading()) {
            <div class="state">Loading prediction history…</div>
          }
          @for (run of runs(); track run.id) {
            <button type="button" class="run-row" [class.active]="selected()?.id === run.id" (click)="open(run)">
              <span class="run-id">#{{ run.id }}</span>
              <p>
                <strong>{{ run.circuitName }}</strong>
                <small>{{ run.seasonYear }} · Round {{ run.round }} · {{ run.createdAt | date: 'MMM d, HH:mm' }}</small>
              </p>
              <b>{{ run.resultCount }}</b>
            </button>
          } @empty {
            @if (!loading()) {
              <div class="state">No prediction runs have been stored yet.</div>
            }
          }
        </article>
        <article class="card detail">
          <div class="card-head"><div><h2>PREDICTION EVALUATION</h2><p>Predicted order versus the official result</p></div></div>
          @if (selected(); as run) {
            <div class="meta"><span>RUN #{{ run.id }}</span><span>MODEL {{ shortVersion(run.modelVersion) }}</span></div>
            @if (evaluation(); as score) {
              @if (score.status === 'PENDING') {
                <div class="pending">
                  <strong>AWAITING CLASSIFICATION</strong>
                  <span>Metrics appear once official race results are ingested.</span>
                </div>
              } @else {
                <div class="metrics">
                  <div><span>MAE</span><strong>{{ score.meanAbsoluteError }}</strong></div>
                  <div><span>RMSE</span><strong>{{ score.rootMeanSquaredError }}</strong></div>
                  <div><span>EXACT</span><strong>{{ score.exactMatchRate }}%</strong></div>
                  <div><span>IN RANGE</span><strong>{{ score.confidenceCoverage }}%</strong></div>
                </div>
                <p class="coverage">{{ score.evaluatedCount }} of {{ score.predictionCount }} drivers evaluated · {{ score.status }}</p>
              }
            }
            <h2 class="classification">PREDICTED VS ACTUAL</h2>
            @for (result of run.results; track result.driverRef; let i = $index) {
              <div class="result">
                <b>{{ i + 1 }}</b>
                <p>
                  <strong>{{ formatRef(result.driverRef) }}</strong>
                  <small>{{ formatRef(result.constructorRef) }} · Grid {{ result.gridPosition }}</small>
                </p>
                @if (evaluationFor(result.driverRef); as actual) {
                  <span class="actual"><small>ACTUAL</small><b>{{ actual.actualPosition }}</b></span>
                  <em [class.hit]="actual.withinConfidenceRange">±{{ actual.absoluteError }}</em>
                } @else {
                  <span class="actual muted-value">—</span>
                  <em>{{ result.confidenceRangeLow }}–{{ result.confidenceRangeHigh }}</em>
                }
              </div>
            }
          } @else {
            <div class="state">Select a prediction run to inspect it.</div>
          }
        </article>
      </div>
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .layout {
        display: grid;
        grid-template-columns: 0.9fr 1.1fr;
        gap: 18px;
        align-items: start;
      }
      .layout > article {
        padding: 22px;
      }
      .card-head {
        margin-bottom: 14px;
      }
      .card-head p {
        margin: 4px 0 0;
        color: var(--ps-text-secondary);
        font-size: 10px;
      }
      .run-row {
        width: 100%;
        display: grid;
        grid-template-columns: 38px 1fr 26px;
        align-items: center;
        gap: 12px;
        min-height: 58px;
        padding: 8px 10px;
        border: 0;
        border-bottom: 1px solid var(--ps-border);
        background: var(--ps-surface);
        text-align: left;
        cursor: pointer;
      }
      .run-row:last-child {
        border-bottom: 0;
      }
      .run-row.active {
        background: var(--ps-red-subtle);
      }
      .run-row > b {
        font: 500 10px var(--ps-font-mono);
        color: var(--ps-text-secondary);
        text-align: right;
      }
      .run-row .run-id {
        color: var(--ps-text-muted);
        font: 500 9px var(--ps-font-mono);
      }
      .meta {
        font: 500 9px var(--ps-font-mono);
        display: flex;
        justify-content: space-between;
        padding: 0 0 15px;
        color: var(--ps-text-secondary);
      }
      .runs p,
      .result p {
        margin: 0;
      }
      .runs strong,
      .runs small,
      .result strong,
      .result small {
        display: block;
      }
      .runs small {
        margin-top: 4px;
        color: var(--ps-text-secondary);
        font-size: 9px;
      }
      .result small {
        margin-top: 4px;
        color: var(--ps-text-secondary);
        font-size: 9px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1px solid var(--ps-border);
        border-radius: var(--ps-radius-sm);
      }
      .metrics div {
        padding: 13px;
        border-right: 1px solid var(--ps-border);
      }
      .metrics div:last-child {
        border: 0;
      }
      .metrics span,
      .metrics strong {
        display: block;
      }
      .metrics span {
        color: var(--ps-text-secondary);
        font: 600 8px var(--ps-font-mono);
        letter-spacing: 0.04em;
      }
      .metrics strong {
        margin-top: 7px;
        font: 500 18px var(--ps-font-heading);
      }
      .coverage {
        margin: 9px 0 20px;
        color: var(--ps-text-secondary);
        font: 500 9px var(--ps-font-mono);
      }
      .pending {
        padding: 20px;
        margin-bottom: 20px;
        background: var(--ps-bg);
        border-radius: var(--ps-radius-sm);
      }
      .pending strong,
      .pending span {
        display: block;
      }
      .pending strong {
        font: 600 9px var(--ps-font-mono);
      }
      .pending span {
        margin-top: 7px;
        color: var(--ps-text-secondary);
        font-size: 10px;
      }
      .classification {
        padding-top: 4px;
        margin-bottom: 8px;
      }
      .result {
        display: grid;
        grid-template-columns: 32px 1fr 42px 45px;
        align-items: center;
        gap: 10px;
        min-height: 58px;
        border-bottom: 1px solid var(--ps-border);
      }
      .result:last-child {
        border-bottom: 0;
      }
      .result > b {
        display: grid;
        place-items: center;
        width: 29px;
        height: 29px;
        border-radius: 50%;
        background: var(--ps-text);
        color: #fff;
        font: 600 11px var(--ps-font-mono);
      }
      .actual small,
      .actual b {
        display: block;
        text-align: center;
      }
      .actual small {
        color: var(--ps-text-muted);
        font: 500 7px var(--ps-font-mono);
      }
      .actual b {
        margin-top: 3px;
        font: 600 12px var(--ps-font-mono);
      }
      .muted-value {
        color: var(--ps-text-muted);
        text-align: center;
      }
      .result > em {
        color: var(--ps-red);
        font: 500 9px var(--ps-font-mono);
        font-style: normal;
        text-align: right;
      }
      .result > em.hit {
        color: var(--ps-green);
      }
      .state {
        display: grid;
        place-items: center;
        min-height: 240px;
        color: var(--ps-text-secondary);
        font-size: 10px;
      }
      @media (max-width: 800px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 460px) {
        .metrics {
          grid-template-columns: 1fr 1fr;
        }
        .metrics div:nth-child(2) {
          border-right: 0;
        }
        .metrics div:nth-child(-n + 2) {
          border-bottom: 1px solid var(--ps-border);
        }
      }
    `,
  ],
})
export class PredictionHistoryComponent {
  private readonly service = inject(PredictionService);
  readonly runs = signal<PredictionRunSummary[]>([]);
  readonly selected = signal<PredictionRunDetail | null>(null);
  readonly evaluation = signal<PredictionEvaluation | null>(null);
  readonly loading = signal(true);
  constructor() {
    this.service.getHistory().subscribe({
      next: (runs) => {
        this.runs.set(runs);
        this.loading.set(false);
        if (runs[0]) this.open(runs[0]);
      },
      error: () => this.loading.set(false),
    });
  }
  open(run: PredictionRunSummary): void {
    this.selected.set(null);
    this.evaluation.set(null);
    forkJoin({
      detail: this.service.getHistoryRun(run.id),
      evaluation: this.service.getEvaluation(run.id),
    }).subscribe(({ detail, evaluation }) => {
      this.selected.set(detail);
      this.evaluation.set(evaluation);
    });
  }
  evaluationFor(driverRef: string): PredictionEvaluationResult | undefined {
    return this.evaluation()?.results.find((result) => result.driverRef === driverRef);
  }
  shortVersion(version: string): string {
    return version && version !== 'unknown' ? version.slice(0, 8) : 'unknown';
  }
  formatRef(ref: string): string {
    return ref
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
