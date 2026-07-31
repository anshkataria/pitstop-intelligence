import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  LucideAngularModule,
  Flag,
  MapPin,
  Radio,
  Clock,
  Gauge,
  Thermometer,
  Wind,
  Droplets,
  Zap,
  CircleDot,
  Timer,
  TriangleAlert,
  ShieldAlert,
  Activity,
} from 'lucide-angular';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { HistoricalChartSeries, HistoricalLineChartComponent } from '../../shared/components/charts/historical-line-chart.component';
import { LiveIntelligence, LiveLap, LivePitStop, LiveSession, LiveStint, LiveTelemetryPoint, LiveTimingRow, LiveWeather, RaceControlMessage, ReplayStatus } from '../../core/models/live.model';
import { LiveService } from '../../core/services/live.service';
import { AuthService } from '../../core/services/auth.service';

const REPLAY_SESSIONS: { value: string; label: string }[] = [
  { value: 'R', label: 'Race' },
  { value: 'Q', label: 'Qualifying' },
  { value: 'S', label: 'Sprint' },
  { value: 'SQ', label: 'Sprint qualifying' },
  { value: 'FP1', label: 'Practice 1' },
  { value: 'FP2', label: 'Practice 2' },
  { value: 'FP3', label: 'Practice 3' },
];

const MODEL_META: Record<string, { label: string; icon: unknown }> = {
  PIT_WINDOW: { label: 'Pit window', icon: Timer },
  TYRE_DEGRADATION: { label: 'Tyre degradation', icon: Gauge },
  SAFETY_CAR: { label: 'Safety car risk', icon: TriangleAlert },
  DNF: { label: 'DNF risk', icon: ShieldAlert },
  STRATEGY: { label: 'Strategy call', icon: Activity },
};

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, IntelligenceShellComponent, HistoricalLineChartComponent],
  template: `<app-intelligence-shell
    ><section class="screen live-screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow"><i [class.connected]="connected()"></i>{{ connected() ? 'STREAM CONNECTED' : 'REPLAY / RECENT DATA' }}</p>
          <h1>Live Race Intelligence</h1>
          <p>Timing, telemetry, strategy and race-control signals from one session.</p>
        </div>
        <select class="ps-select" [ngModel]="sessionKey()" (ngModelChange)="selectSession($event)">
          @for (session of sessions(); track session.sessionKey) {
            <option [value]="session.sessionKey">{{ session.year }} · {{ session.countryName }} · {{ session.sessionName }}</option>
          }
        </select>
      </header>

      @if (isAdmin()) {
        <section class="card replay-panel">
          <div class="card-head">
            <div><h2>FASTF1 REPLAY</h2><p>Import a past session so it appears in the session list above.</p></div>
            @if (replayStatus(); as status) {
              <span
                class="ps-badge"
                [class.ps-badge--live]="status.state === 'SUCCEEDED'"
                [class.ps-badge--info]="status.state === 'RUNNING'"
                [class.ps-badge--warning]="status.state === 'FAILED'"
                [class.ps-badge--neutral]="status.state === 'IDLE'"
              >{{ replayStatusLabel(status) }}</span>
            }
          </div>
          <form class="replay-form" (ngSubmit)="startReplay()">
            <label>Year
              <input class="replay-input" type="number" [(ngModel)]="replayYear" name="replayYear" min="2018" max="2100" required />
            </label>
            <label>Event
              <input class="replay-input" type="text" [(ngModel)]="replayEvent" name="replayEvent" placeholder="Monaco or round number" required />
            </label>
            <label>Session
              <select class="ps-select replay-input" [(ngModel)]="replaySession" name="replaySession">
                @for (option of replaySessionOptions; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </label>
            <button class="btn-primary" type="submit" [disabled]="replayBusy()">
              {{ replayBusy() ? 'Importing…' : 'Start replay' }}
            </button>
          </form>
          @if (replayError()) { <p class="feedback error" role="alert">{{ replayError() }}</p> }
        </section>
      }

      @if (loading()) {
        <div class="card state">Loading session intelligence…</div>
      } @else if (error()) {
        <div class="card state">{{ error() }}</div>
      } @else if (activeSession(); as session) {
        <section class="stat-strip">
          <article class="card stat">
            <lucide-icon [img]="flagIcon" [size]="16" />
            <small>SESSION</small>
            <strong>{{ session.sessionName }}</strong>
          </article>
          <article class="card stat">
            <lucide-icon [img]="mapPinIcon" [size]="16" />
            <small>CIRCUIT</small>
            <strong>{{ session.circuitName || '—' }}</strong>
          </article>
          <article class="card stat">
            <lucide-icon [img]="radioIcon" [size]="16" />
            <small>DATA SOURCE</small>
            <strong>{{ session.provider }}</strong>
          </article>
          <article class="card stat">
            <lucide-icon [img]="clockIcon" [size]="16" />
            <small>LAST UPDATED</small>
            <strong>{{ lastUpdated() | date: 'HH:mm:ss' }}</strong>
          </article>
        </section>

        <div class="live-grid">
          <article class="card timing">
            <div class="card-head">
              <div><h2>TIMING TOWER</h2><p>Position, interval and completed lap</p></div>
              <span>{{ timing().length }} cars</span>
            </div>
            @for (row of timing(); track row.driverNumber) {
              <button
                type="button"
                class="timing-row"
                [class.selected]="row.driverNumber === selectedDriver()"
                (click)="selectDriver(row.driverNumber)"
              >
                <b>{{ row.position ?? '—' }}</b>
                <i [style.background]="'#' + (row.teamColour || '555555')"></i>
                <strong>{{ row.driverCode || row.driverNumber }}</strong>
                <span>{{ row.teamName || row.fullName }}</span>
                <em>{{ row.gapToLeader || row.intervalToLeader || '—' }}</em>
                <small>Lap {{ row.lapNumber }}</small>
              </button>
            } @empty {
              <div class="empty">No timing records have arrived.</div>
            }
          </article>

          <article class="card weather">
            <div class="card-head"><div><h2>TRACK CONDITIONS</h2></div></div>
            @if (latestWeather(); as weather) {
              <div class="weather-value">
                <strong>{{ weather.trackTemperature ?? '—' }}°</strong>
                <span>Track temperature</span>
              </div>
              <div class="weather-grid">
                <span><lucide-icon [img]="thermometerIcon" [size]="13" />Air<b>{{ weather.airTemperature ?? '—' }}°C</b></span>
                <span><lucide-icon [img]="dropletsIcon" [size]="13" />Humidity<b>{{ weather.humidity ?? '—' }}%</b></span>
                <span><lucide-icon [img]="windIcon" [size]="13" />Wind<b>{{ weather.windSpeed ?? '—' }} m/s</b></span>
                <span><lucide-icon [img]="dropletsIcon" [size]="13" />Rain<b>{{ weather.rainfall ? 'Detected' : 'Clear' }}</b></span>
              </div>
            } @else {
              <div class="empty">No weather sample.</div>
            }
          </article>

          <article class="card telemetry">
            <div class="card-head">
              <div><h2>DRIVER TELEMETRY</h2><p>{{ selectedDriverName() }}</p></div>
              <div class="tab-switch">
                <button type="button" [class.active]="telemetryTab() === 'speed'" (click)="telemetryTab.set('speed')">Speed</button>
                <button type="button" [class.active]="telemetryTab() === 'inputs'" (click)="telemetryTab.set('inputs')">Throttle / brake</button>
                <button type="button" [class.active]="telemetryTab() === 'sectors'" (click)="telemetryTab.set('sectors')">Sectors</button>
              </div>
            </div>
            <div class="car-state">
              <span><lucide-icon [img]="circleDotIcon" [size]="13" /><small>GEAR</small><b>{{ latestTelemetry()?.gear ?? '—' }}</b></span>
              <span><lucide-icon [img]="zapIcon" [size]="13" /><small>RPM</small><b>{{ latestTelemetry()?.rpm ?? '—' }}</b></span>
              <span><lucide-icon [img]="radioIcon" [size]="13" /><small>DRS</small><b>{{ drsState() }}</b></span>
              <span><lucide-icon [img]="gaugeIcon" [size]="13" /><small>SPEED</small><b>{{ latestTelemetry()?.speed ?? '—' }} km/h</b></span>
              <span><lucide-icon [img]="timerIcon" [size]="13" /><small>LAST LAP</small><b>{{ formatLapTime(latestLap()?.lapDuration) }}</b></span>
            </div>
            @switch (telemetryTab()) {
              @case ('speed') { <app-historical-line-chart [series]="speedSeries()" xLabel="Sample" yLabel="km/h" ariaLabel="Selected driver speed telemetry" /> }
              @case ('inputs') { <app-historical-line-chart [series]="inputSeries()" xLabel="Sample" yLabel="Percent" ariaLabel="Selected driver throttle and brake telemetry" /> }
              @case ('sectors') { <app-historical-line-chart [series]="sectorSeries()" xLabel="Lap" yLabel="Seconds" ariaLabel="Selected driver sector time history" /> }
            }
          </article>

          <article class="card strategy-feed">
            <div class="card-head"><div><h2>TYRE STRATEGY</h2><p>Stints and pit-stop history</p></div></div>
            @for (stint of selectedStints(); track stint.stintNumber) {
              <div class="stint">
                <b>{{ stint.compound || 'UNKNOWN' }}</b>
                <span>Laps {{ stint.lapStart ?? '—' }}–{{ stint.lapEnd ?? 'current' }}</span>
                <small>Started on tyre age {{ stint.tyreAgeAtStart ?? 0 }} laps</small>
              </div>
            }
            @for (pit of selectedPits(); track pit.lapNumber) {
              <div class="pit">
                <b>{{ pitDurationLabel(pit) }} · Lap {{ pit.lapNumber }}</b>
                <span>{{ pitDurationText(pit) }}</span>
              </div>
            }
            @empty {
              <div class="empty">No pit-stop events.</div>
            }
          </article>

          <article class="card intelligence">
            <div class="card-head"><div><h2>PREDICTIVE SIGNALS</h2><p>Live model outputs for the selected driver</p></div></div>
            <div class="model-grid">
              @for (item of selectedIntelligence(); track item.modelType) {
                <div class="model-card">
                  <lucide-icon [img]="modelIcon(item.modelType)" [size]="15" />
                  <small>{{ modelLabel(item.modelType) }}</small>
                  <strong>{{ modelValue(item) }}</strong>
                  <span>{{ item.confidence * 100 | number: '1.0-0' }}% confidence</span>
                </div>
              } @empty {
                <div class="empty">Waiting for sufficient telemetry.</div>
              }
            </div>
          </article>

          <article class="card control">
            <div class="card-head"><div><h2>RACE CONTROL</h2></div></div>
            @for (message of raceControl().slice(0, 8); track message.occurredAt + message.message) {
              <div class="control-row">
                <span class="ps-badge" [class.ps-badge--warning]="message.flag" [class.ps-badge--neutral]="!message.flag">{{ message.flag || message.category || 'INFO' }}</span>
                <p>
                  {{ message.message }}
                  <small>{{ message.occurredAt | date: 'HH:mm:ss' }} · Lap {{ message.lapNumber ?? '—' }}</small>
                </p>
              </div>
            } @empty {
              <div class="empty">No race-control messages.</div>
            }
          </article>
        </div>
      } @else {
        <div class="card state">No live or replay sessions are stored. Start a FastF1 replay or enable the OpenF1 worker.</div>
      }
    </section></app-intelligence-shell
  >`,
  styleUrl: './live.component.scss',
})
export class LiveComponent implements OnDestroy {
  private readonly service = inject(LiveService);
  private readonly auth = inject(AuthService);
  readonly isAdmin = computed(()=>this.auth.user()?.role === 'ADMIN');
  readonly replaySessionOptions = REPLAY_SESSIONS;
  replayYear = new Date().getFullYear();
  replayEvent = '';
  replaySession = 'R';
  readonly replayBusy = signal(false);
  readonly replayError = signal('');
  readonly replayStatus = signal<ReplayStatus | null>(null);
  private replayPollTimer?: ReturnType<typeof setTimeout>;
  readonly sessions = signal<LiveSession[]>([]); readonly sessionKey = signal('');
  readonly timing = signal<LiveTimingRow[]>([]); readonly weather = signal<LiveWeather[]>([]);
  readonly raceControl = signal<RaceControlMessage[]>([]); readonly intelligence = signal<LiveIntelligence[]>([]);
  readonly laps = signal<LiveLap[]>([]); readonly stints = signal<LiveStint[]>([]); readonly pitStops = signal<LivePitStop[]>([]);
  readonly telemetry = signal<LiveTelemetryPoint[]>([]); readonly selectedDriver = signal<number|null>(null);
  readonly loading = signal(true); readonly error = signal(''); readonly connected = signal(false);
  readonly telemetryTab = signal<'speed' | 'inputs' | 'sectors'>('speed');
  readonly lastUpdated = signal(new Date()); private streamController?: AbortController; private refreshTimer?: ReturnType<typeof setTimeout>; private reconnectTimer?: ReturnType<typeof setTimeout>;
  readonly activeSession = computed(()=>this.sessions().find(s=>s.sessionKey===this.sessionKey())??null);
  readonly latestWeather = computed(()=>this.weather().at(-1)??null);
  readonly latestTelemetry = computed(()=>[...this.telemetry()].reverse().find(point=>point.speed!=null||point.rpm!=null||point.gear!=null)??null);
  readonly latestLap = computed(()=>this.laps().filter(l=>l.driverNumber===this.selectedDriver()).at(-1)??null);
  readonly selectedDriverName = computed(()=>this.timing().find(row=>row.driverNumber===this.selectedDriver())?.fullName??`Car ${this.selectedDriver()??'—'}`);
  readonly selectedIntelligence = computed(()=>this.intelligence().filter(item=>item.driverNumber===0||item.driverNumber===this.selectedDriver()));
  readonly selectedStints = computed(()=>this.stints().filter(item=>item.driverNumber===this.selectedDriver()));
  readonly selectedPits = computed(()=>this.pitStops().filter(item=>item.driverNumber===this.selectedDriver()));
  readonly speedSeries = computed<HistoricalChartSeries[]>(()=>[{key:'speed',label:'Speed',color:'#d92332',points:this.samples().filter(p=>p.speed!=null).map((p,i)=>({x:i,y:p.speed!,label:new Date(p.capturedAt).toLocaleTimeString()}))}]);
  readonly inputSeries = computed<HistoricalChartSeries[]>(()=>[
    {key:'throttle',label:'Throttle',color:'#2d7d5b',points:this.samples().filter(p=>p.throttle!=null).map((p,i)=>({x:i,y:p.throttle!,label:new Date(p.capturedAt).toLocaleTimeString()}))},
    {key:'brake',label:'Brake',color:'#d92332',points:this.samples().filter(p=>p.brake!=null).map((p,i)=>({x:i,y:p.brake!*100,label:new Date(p.capturedAt).toLocaleTimeString()}))},
  ]);
  readonly sectorSeries = computed<HistoricalChartSeries[]>(()=>{
    const laps=this.laps().filter(l=>l.driverNumber===this.selectedDriver()).slice(-30);
    return [
      {key:'s1',label:'Sector 1',color:'#d98516',points:laps.filter(l=>l.sector1Duration!=null).map(l=>({x:l.lapNumber,y:l.sector1Duration!,label:`Lap ${l.lapNumber}`}))},
      {key:'s2',label:'Sector 2',color:'#24688a',points:laps.filter(l=>l.sector2Duration!=null).map(l=>({x:l.lapNumber,y:l.sector2Duration!,label:`Lap ${l.lapNumber}`}))},
      {key:'s3',label:'Sector 3',color:'#d92332',points:laps.filter(l=>l.sector3Duration!=null).map(l=>({x:l.lapNumber,y:l.sector3Duration!,label:`Lap ${l.lapNumber}`}))},
    ];
  });

  readonly flagIcon = Flag;
  readonly mapPinIcon = MapPin;
  readonly radioIcon = Radio;
  readonly clockIcon = Clock;
  readonly gaugeIcon = Gauge;
  readonly thermometerIcon = Thermometer;
  readonly windIcon = Wind;
  readonly dropletsIcon = Droplets;
  readonly zapIcon = Zap;
  readonly circleDotIcon = CircleDot;
  readonly timerIcon = Timer;
  readonly activityIcon = Activity;

  constructor(){this.service.sessions().subscribe({next:sessions=>{this.sessions.set(sessions);this.loading.set(false);if(sessions[0])this.selectSession(sessions[0].sessionKey);},error:()=>{this.error.set('Unable to load live sessions.');this.loading.set(false);}});if(this.isAdmin())this.pollReplayStatus();}
  selectSession(key:string){this.sessionKey.set(key);this.streamController?.abort();this.loadSnapshot();this.connect();}
  selectDriver(number:number){this.selectedDriver.set(number);this.loadTelemetry();}
  loadSnapshot(){const key=this.sessionKey();if(!key)return;forkJoin({timing:this.service.timing(key),weather:this.service.weather(key),control:this.service.raceControl(key),intelligence:this.service.intelligence(key),laps:this.service.laps(key),stints:this.service.stints(key),pits:this.service.pitStops(key)}).subscribe({next:data=>{this.timing.set(data.timing);this.weather.set(data.weather);this.raceControl.set(data.control);this.intelligence.set(data.intelligence);this.laps.set(data.laps);this.stints.set(data.stints);this.pitStops.set(data.pits);this.lastUpdated.set(new Date());if(this.selectedDriver()==null&&data.timing[0])this.selectedDriver.set(data.timing[0].driverNumber);this.loadTelemetry();},error:()=>this.error.set('Unable to load this session snapshot.')});}
  loadTelemetry(){const key=this.sessionKey(),driver=this.selectedDriver();if(key&&driver!=null)this.service.telemetry(key,driver).subscribe({next:points=>this.telemetry.set(points)});}
  connect(){clearTimeout(this.reconnectTimer);const controller=new AbortController();this.streamController=controller;this.service.stream(this.sessionKey(),controller.signal,event=>{this.connected.set(true);if(event.event!=='heartbeat'){clearTimeout(this.refreshTimer);this.refreshTimer=setTimeout(()=>this.loadSnapshot(),750);}}).catch(()=>undefined).finally(()=>{if(!controller.signal.aborted&&this.streamController===controller){this.connected.set(false);this.reconnectTimer=setTimeout(()=>this.connect(),3000);}});}
  samples(){const data=this.telemetry();return data.length>300?data.slice(-300):data;}
  drsState(){const drs=this.latestTelemetry()?.drs;return drs==null?'—':drs>=10?'OPEN':'CLOSED';}
  modelLabel(type:string){return MODEL_META[type]?.label ?? type.replaceAll('_',' ');}
  modelIcon(type:string){return (MODEL_META[type]?.icon as typeof Activity) ?? this.activityIcon;}
  modelValue(item:LiveIntelligence){const o=item.output;if(item.modelType==='PIT_WINDOW')return `Lap ${o['windowStart']}–${o['windowEnd']}`;if(item.modelType==='TYRE_DEGRADATION')return `${o['secondsPerLap']} s/lap`;if(item.modelType==='SAFETY_CAR'||item.modelType==='DNF')return `${Math.round(Number(o['probability'])*100)}%`;return String(o['recommended']??o['risk']??'Ready');}
  formatLapTime(seconds:number|null|undefined):string{
    if(seconds==null)return '—';
    const minutes=Math.floor(seconds/60);
    const remainder=(seconds-minutes*60).toFixed(3).padStart(6,'0');
    return `${minutes}:${remainder}`;
  }
  pitDurationLabel(pit:LivePitStop):string{return pit.stopDuration!=null?'Pit stop':'Pit lane';}
  pitDurationText(pit:LivePitStop):string{const value=pit.stopDuration??pit.laneDuration;return value==null?'—':`${value.toFixed(1)} s`;}
  replayStatusLabel(status:ReplayStatus):string{
    switch(status.state){
      case 'RUNNING':return 'Importing…';
      case 'SUCCEEDED':return 'Import complete';
      case 'FAILED':return 'Import failed';
      default:return 'No replay yet';
    }
  }
  startReplay(){
    if(this.replayBusy())return;
    this.replayError.set('');
    this.replayBusy.set(true);
    this.service.startReplay({year:Number(this.replayYear),event:this.replayEvent,session:this.replaySession}).subscribe({
      next:()=>this.pollReplayStatus(),
      error:(err)=>{this.replayBusy.set(false);this.replayError.set(err?.error?.message ?? err?.error?.detail ?? 'Unable to start the replay import.');},
    });
  }
  private pollReplayStatus(){
    clearTimeout(this.replayPollTimer);
    this.service.replayStatus().subscribe({
      next:(status)=>{
        this.replayStatus.set(status);
        if(status.state==='RUNNING'){this.replayBusy.set(true);this.replayPollTimer=setTimeout(()=>this.pollReplayStatus(),3000);return;}
        this.replayBusy.set(false);
        if(status.state==='FAILED')this.replayError.set(status.error||'The replay import failed.');
        if(status.state==='SUCCEEDED')this.service.sessions().subscribe({next:(sessions)=>this.sessions.set(sessions)});
      },
      error:()=>{this.replayBusy.set(false);},
    });
  }
  ngOnDestroy(){this.streamController?.abort();clearTimeout(this.refreshTimer);clearTimeout(this.reconnectTimer);clearTimeout(this.replayPollTimer);}
}
