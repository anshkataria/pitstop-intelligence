import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PredictionRunDetail, PredictionRunSummary } from '../../core/models/prediction.model';
import { PredictionService } from '../../core/services/prediction.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-prediction-history', standalone: true,
  imports: [DatePipe, IntelligenceShellComponent],
  template: `<app-intelligence-shell><section class="screen"><header class="screen-head"><div><p class="eyebrow">MODEL ARCHIVE</p><h1>Prediction History</h1><p>Every stored forecast, model version and confidence range.</p></div></header>
    <div class="layout"><article class="card runs"><h2>RECENT RUNS</h2>@if(loading()){<div class="state">Loading prediction history…</div>}@for(run of runs();track run.id){<button type="button" [class.active]="selected()?.id===run.id" (click)="open(run)"><span>#{{run.id}}</span><p><strong>{{run.circuitName}}</strong><small>{{run.seasonYear}} · Round {{run.round}} · {{run.createdAt|date:'medium'}}</small></p><b>{{run.resultCount}}</b></button>}@empty{<div class="state">No prediction runs have been stored yet.</div>}</article>
    <article class="card detail"><h2>PREDICTED CLASSIFICATION</h2>@if(selected();as run){<div class="meta"><span>RUN #{{run.id}}</span><span>MODEL {{shortVersion(run.modelVersion)}}</span></div>@for(result of run.results;track result.driverRef){<div class="result"><b>{{result.predictedPositionRounded}}</b><p><strong>{{result.driverRef.toUpperCase()}}</strong><small>{{result.constructorRef}} · Grid {{result.gridPosition}}</small></p><em>{{result.confidenceRangeLow}}–{{result.confidenceRangeHigh}}</em></div>}}@else{<div class="state">Select a prediction run to inspect it.</div>}</article></div>
  </section></app-intelligence-shell>`,
  styles: [`.layout{display:grid;grid-template-columns:.9fr 1.1fr;gap:18px}.layout>article{padding:22px}.runs button{width:100%;display:grid;grid-template-columns:42px 1fr 25px;align-items:center;gap:10px;min-height:62px;padding:8px 10px;border:0;border-bottom:1px solid #eee;background:#fff;text-align:left;cursor:pointer}.runs button.active{background:#fff6f6}.runs button>span,.runs button>b,.meta{font:500 9px var(--ps-font-mono)}.runs p,.result p{margin:0}.runs strong,.runs small,.result strong,.result small{display:block}.runs small,.result small{margin-top:4px;color:#777;font-size:8px}.meta{display:flex;justify-content:space-between;padding:12px 0 15px;color:#777}.result{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:10px;min-height:53px;border-bottom:1px solid #eee}.result>b{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:#171819;color:#fff;font:500 10px var(--ps-font-mono)}.result>em{color:#d92332;font:500 10px var(--ps-font-mono);font-style:normal}.state{display:grid;place-items:center;min-height:240px;color:#777;font-size:10px}@media(max-width:800px){.layout{grid-template-columns:1fr}}`],
})
export class PredictionHistoryComponent {
  private readonly service = inject(PredictionService);
  readonly runs = signal<PredictionRunSummary[]>([]);
  readonly selected = signal<PredictionRunDetail | null>(null);
  readonly loading = signal(true);
  constructor() { this.service.getHistory().subscribe({ next: (runs) => { this.runs.set(runs); this.loading.set(false); if (runs[0]) this.open(runs[0]); }, error: () => this.loading.set(false) }); }
  open(run: PredictionRunSummary): void { this.service.getHistoryRun(run.id).subscribe((detail) => this.selected.set(detail)); }
  shortVersion(version: string): string { return version && version !== 'unknown' ? version.slice(0, 8) : 'unknown'; }
}
