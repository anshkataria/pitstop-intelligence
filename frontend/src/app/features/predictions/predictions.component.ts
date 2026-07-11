import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PredictionService } from '../../core/services/prediction.service';
import { PredictionResult } from '../../core/models/prediction.model';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-predictions',
  standalone: true,
  imports: [FormsModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">FORECAST</p>
          <h1>Race Prediction</h1>
          <p>Set the grid. See the likely finishing order.</p>
        </div>
        <span class="health" [class.online]="modelLoaded()"
          >● {{ modelLoaded() ? 'Model ready' : 'Model unavailable' }}</span
        >
      </header>
      <div class="prediction-layout">
        <article class="card builder">
          <h2>Race configuration</h2>
          <div class="form-grid">
            <label>Season<input type="number" [(ngModel)]="season" /></label
            ><label>Round<input type="number" [(ngModel)]="round" /></label
            ><label class="wide">Circuit<input [(ngModel)]="circuitName" /></label>
          </div>
          <h2>Starting grid</h2>
          <div class="entries">
            @for (e of entries; track $index; let i = $index) {
              <div class="entry">
                <b>{{ i + 1 }}</b
                ><input [(ngModel)]="e.driverRef" placeholder="driver ref" /><input
                  [(ngModel)]="e.constructorRef"
                  placeholder="constructor ref"
                /><input [(ngModel)]="e.driverNationality" placeholder="driver nationality" /><input
                  [(ngModel)]="e.constructorNationality"
                  placeholder="team nationality"
                />
              </div>
            }
          </div>
          <button class="btn-primary" (click)="predict()" [disabled]="loading()">
            {{ loading() ? 'Predicting…' : 'Run prediction' }}
          </button>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
        </article>
        <article class="card output">
          <h2>PREDICTED CLASSIFICATION</h2>
          @if (results().length) {
            @for (r of results(); track r.driverRef) {
              <div class="result">
                <span>{{ r.predictedPositionRounded }}</span>
                <p>
                  <strong>{{ r.driverRef }}</strong
                  ><small>{{ r.constructorRef }} · Grid {{ r.gridPosition }}</small>
                </p>
                <b>{{ r.confidenceRangeLow }}–{{ r.confidenceRangeHigh }}</b>
              </div>
            }
          } @else {
            <div class="empty">Run the model to see ranked results and confidence ranges.</div>
          }
        </article>
      </div>
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .health {
        padding: 9px 12px;
        border: 1px solid #ddd;
        border-radius: 18px;
        color: #777;
        font: 500 9px var(--ps-font-mono);
      }
      .health.online {
        color: #2d7d5b;
      }
      .prediction-layout {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 18px;
      }
      .prediction-layout article {
        padding: 22px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin: 20px 0 30px;
      }
      .form-grid .wide {
        grid-column: 1/3;
      }
      label {
        font-size: 9px;
        color: #666;
      }
      input {
        width: 100%;
        height: 40px;
        margin-top: 7px;
        padding: 0 11px;
        border: 1px solid #dedfe0;
        border-radius: 5px;
      }
      .entries {
        margin: 17px 0;
      }
      .entry {
        display: grid;
        grid-template-columns: 24px repeat(4, 1fr);
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      .entry b {
        font: 500 11px var(--ps-font-mono);
      }
      .entry input {
        margin: 0;
      }
      .error {
        color: #d92332;
        font-size: 11px;
      }
      .result {
        display: grid;
        grid-template-columns: 32px 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 14px 0;
        border-bottom: 1px solid #eee;
      }
      .result > span {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #151515;
        color: #fff;
        font: 500 11px var(--ps-font-mono);
      }
      .result p {
        margin: 0;
      }
      .result strong,
      .result small {
        display: block;
      }
      .result small {
        margin-top: 3px;
        color: #777;
        font-size: 9px;
      }
      .result > b {
        font: 500 12px var(--ps-font-mono);
        color: #d92332;
      }
      .empty {
        display: grid;
        place-items: center;
        min-height: 330px;
        color: #888;
        font-size: 11px;
        text-align: center;
      }
      @media (max-width: 900px) {
        .prediction-layout {
          grid-template-columns: 1fr;
        }
        .entry {
          grid-template-columns: 24px 1fr 1fr;
        }
        .entry input:nth-last-child(-n + 2) {
          display: none;
        }
      }
    `,
  ],
})
export class PredictionsComponent {
  private service = inject(PredictionService);
  readonly results = signal<PredictionResult[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly modelLoaded = signal(false);
  season = 2024;
  round = 1;
  circuitName = 'Bahrain International Circuit';
  entries = [
    this.entry('norris', 'mclaren', 'British', 'British', 1),
    this.entry('verstappen', 'red_bull', 'Dutch', 'Austrian', 2),
    this.entry('leclerc', 'ferrari', 'Monegasque', 'Italian', 3),
    this.entry('piastri', 'mclaren', 'Australian', 'British', 4),
    this.entry('sainz', 'ferrari', 'Spanish', 'Italian', 5),
  ];
  constructor() {
    this.service
      .health()
      .subscribe({
        next: (h) => this.modelLoaded.set(h.model_loaded),
        error: () => this.modelLoaded.set(false),
      });
  }
  private entry(
    driverRef: string,
    constructorRef: string,
    driverNationality: string,
    constructorNationality: string,
    gridPosition: number,
  ) {
    return { driverRef, constructorRef, driverNationality, constructorNationality, gridPosition };
  }
  predict() {
    this.loading.set(true);
    this.error.set('');
    const entries = this.entries.map((e, i) => ({
      ...e,
      gridPosition: i + 1,
      circuitName: this.circuitName,
      seasonYear: this.season,
      round: this.round,
    }));
    this.service.predict(entries).subscribe({
      next: (r) => {
        const raw = r.predictions as any[];
        this.results.set(
          raw.map((x) => ({
            driverRef: x.driverRef ?? x.driver_ref,
            constructorRef: x.constructorRef ?? x.constructor_ref,
            gridPosition: x.gridPosition ?? x.grid_position,
            predictedPosition: x.predictedPosition ?? x.predicted_position,
            predictedPositionRounded: x.predictedPositionRounded ?? x.predicted_position_rounded,
            confidenceRangeLow: x.confidenceRangeLow ?? x.confidence_range_low,
            confidenceRangeHigh: x.confidenceRangeHigh ?? x.confidence_range_high,
          })),
        );
        this.modelLoaded.set(r.modelLoaded ?? (r as any).model_loaded);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(
          e.status === 503
            ? 'Prediction model is currently unavailable.'
            : 'Prediction request failed.',
        );
        this.loading.set(false);
      },
    });
  }
}
