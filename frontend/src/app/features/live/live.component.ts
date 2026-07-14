import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';
import { HistoricalChartSeries, HistoricalLineChartComponent } from '../../shared/components/charts/historical-line-chart.component';
import { LiveIntelligence, LiveLap, LivePitStop, LiveSession, LiveStint, LiveTelemetryPoint, LiveTimingRow, LiveWeather, RaceControlMessage } from '../../core/models/live.model';
import { LiveService } from '../../core/services/live.service';

@Component({
  selector: 'app-live', standalone: true,
  imports: [CommonModule, FormsModule, IntelligenceShellComponent, HistoricalLineChartComponent],
  template: `<app-intelligence-shell><section class="screen live-screen">
    <header class="screen-head"><div><p class="eyebrow"><i [class.connected]="connected()"></i>{{connected()?'STREAM CONNECTED':'REPLAY / RECENT DATA'}}</p><h1>Live Race Intelligence</h1><p>Timing, telemetry, strategy and race-control signals from one session.</p></div>
      <select [ngModel]="sessionKey()" (ngModelChange)="selectSession($event)">@for(session of sessions();track session.sessionKey){<option [value]="session.sessionKey">{{session.year}} · {{session.countryName}} · {{session.sessionName}}</option>}</select>
    </header>
    @if(loading()){<div class="card state">Loading session intelligence…</div>}
    @else if(error()){<div class="card state">{{error()}}</div>}
    @else if(activeSession();as session){
      <section class="session-strip"><div><small>SESSION</small><strong>{{session.sessionName}}</strong></div><div><small>CIRCUIT</small><strong>{{session.circuitName||'—'}}</strong></div><div><small>PROVIDER</small><strong>{{session.provider}}</strong></div><div><small>UPDATED</small><strong>{{lastUpdated()|date:'HH:mm:ss'}}</strong></div></section>
      <div class="live-grid">
        <article class="card timing"><div class="card-head"><div><h2>TIMING TOWER</h2><p>Position, interval and completed lap</p></div><span>{{timing().length}} cars</span></div>
          @for(row of timing();track row.driverNumber){<button type="button" class="timing-row" [class.selected]="row.driverNumber===selectedDriver()" (click)="selectDriver(row.driverNumber)"><b>{{row.position??'—'}}</b><i [style.background]="'#'+(row.teamColour||'555555')"></i><strong>{{row.driverCode||row.driverNumber}}</strong><span>{{row.teamName||row.fullName}}</span><em>{{row.gapToLeader||row.intervalToLeader||'—'}}</em><small>L{{row.lapNumber}}</small></button>}@empty{<div class="empty">No timing records have arrived.</div>}
        </article>
        <article class="card weather"><h2>TRACK CONDITIONS</h2>@if(latestWeather();as weather){<div class="weather-value"><strong>{{weather.trackTemperature??'—'}}°</strong><span>Track temperature</span></div><div class="weather-grid"><span>Air <b>{{weather.airTemperature??'—'}}°C</b></span><span>Humidity <b>{{weather.humidity??'—'}}%</b></span><span>Wind <b>{{weather.windSpeed??'—'}} m/s</b></span><span>Rain <b>{{weather.rainfall?'Detected':'Clear'}}</b></span></div>}@else{<div class="empty">No weather sample.</div>}</article>
        <article class="card telemetry"><div class="card-head"><div><h2>CAR TELEMETRY</h2><p>{{selectedDriverName()}} · speed trace</p></div></div><div class="car-state"><span>GEAR <b>{{latestTelemetry()?.gear??'—'}}</b></span><span>RPM <b>{{latestTelemetry()?.rpm??'—'}}</b></span><span>DRS <b>{{drsState()}}</b></span><span>SPEED <b>{{latestTelemetry()?.speed??'—'}} km/h</b></span><span>LAST LAP <b>{{latestLap()?.lapDuration??'—'}} s</b></span></div><app-historical-line-chart [series]="speedSeries()" xLabel="Sample" yLabel="km/h" ariaLabel="Selected driver speed telemetry"/></article>
        <article class="card telemetry"><div class="card-head"><div><h2>DRIVER INPUTS</h2><p>Throttle and brake application</p></div></div><app-historical-line-chart [series]="inputSeries()" xLabel="Sample" yLabel="Percent" ariaLabel="Selected driver throttle and brake telemetry"/></article>
        <article class="card telemetry"><div class="card-head"><div><h2>SECTOR PERFORMANCE</h2><p>Sector durations by completed lap</p></div></div><app-historical-line-chart [series]="sectorSeries()" xLabel="Lap" yLabel="Seconds" ariaLabel="Selected driver sector time history"/></article>
        <article class="card strategy-feed"><h2>STINTS & PIT STOPS</h2>@for(stint of selectedStints();track stint.stintNumber){<div class="stint"><b>{{stint.compound||'UNKNOWN'}}</b><span>L{{stint.lapStart??'—'}}–{{stint.lapEnd??'current'}}</span><small>Start age {{stint.tyreAgeAtStart??0}} laps</small></div>}@for(pit of selectedPits();track pit.lapNumber){<div class="pit"><b>PIT · L{{pit.lapNumber}}</b><span>{{pit.stopDuration??pit.laneDuration??'—'}} s</span></div>}@empty{<div class="empty">No pit-stop events.</div>}</article>
        <article class="card intelligence"><h2>LIVE MODELS</h2><div class="model-grid">@for(item of selectedIntelligence();track item.modelType){<div><small>{{modelLabel(item.modelType)}}</small><strong>{{modelValue(item)}}</strong><span>{{item.confidence*100|number:'1.0-0'}}% confidence</span></div>}@empty{<div class="empty">Waiting for sufficient telemetry.</div>}</div></article>
        <article class="card control"><h2>RACE CONTROL</h2>@for(message of raceControl().slice(0,8);track message.occurredAt+message.message){<div class="control-row"><span [class.alert]="message.flag">{{message.flag||message.category||'INFO'}}</span><p>{{message.message}}<small>{{message.occurredAt|date:'HH:mm:ss'}} · Lap {{message.lapNumber??'—'}}</small></p></div>}@empty{<div class="empty">No race-control messages.</div>}</article>
      </div>
    }@else{<div class="card state">No live or replay sessions are stored. Start a FastF1 replay or enable the OpenF1 worker.</div>}
  </section></app-intelligence-shell>`,
  styleUrl: './live.component.scss',
})
export class LiveComponent implements OnDestroy {
  private readonly service = inject(LiveService);
  readonly sessions = signal<LiveSession[]>([]); readonly sessionKey = signal('');
  readonly timing = signal<LiveTimingRow[]>([]); readonly weather = signal<LiveWeather[]>([]);
  readonly raceControl = signal<RaceControlMessage[]>([]); readonly intelligence = signal<LiveIntelligence[]>([]);
  readonly laps = signal<LiveLap[]>([]); readonly stints = signal<LiveStint[]>([]); readonly pitStops = signal<LivePitStop[]>([]);
  readonly telemetry = signal<LiveTelemetryPoint[]>([]); readonly selectedDriver = signal<number|null>(null);
  readonly loading = signal(true); readonly error = signal(''); readonly connected = signal(false);
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

  constructor(){this.service.sessions().subscribe({next:sessions=>{this.sessions.set(sessions);this.loading.set(false);if(sessions[0])this.selectSession(sessions[0].sessionKey);},error:()=>{this.error.set('Unable to load live sessions.');this.loading.set(false);}});}
  selectSession(key:string){this.sessionKey.set(key);this.streamController?.abort();this.loadSnapshot();this.connect();}
  selectDriver(number:number){this.selectedDriver.set(number);this.loadTelemetry();}
  loadSnapshot(){const key=this.sessionKey();if(!key)return;forkJoin({timing:this.service.timing(key),weather:this.service.weather(key),control:this.service.raceControl(key),intelligence:this.service.intelligence(key),laps:this.service.laps(key),stints:this.service.stints(key),pits:this.service.pitStops(key)}).subscribe({next:data=>{this.timing.set(data.timing);this.weather.set(data.weather);this.raceControl.set(data.control);this.intelligence.set(data.intelligence);this.laps.set(data.laps);this.stints.set(data.stints);this.pitStops.set(data.pits);this.lastUpdated.set(new Date());if(this.selectedDriver()==null&&data.timing[0])this.selectedDriver.set(data.timing[0].driverNumber);this.loadTelemetry();},error:()=>this.error.set('Unable to load this session snapshot.')});}
  loadTelemetry(){const key=this.sessionKey(),driver=this.selectedDriver();if(key&&driver!=null)this.service.telemetry(key,driver).subscribe({next:points=>this.telemetry.set(points)});}
  connect(){clearTimeout(this.reconnectTimer);const controller=new AbortController();this.streamController=controller;this.service.stream(this.sessionKey(),controller.signal,event=>{this.connected.set(true);if(event.event!=='heartbeat'){clearTimeout(this.refreshTimer);this.refreshTimer=setTimeout(()=>this.loadSnapshot(),750);}}).catch(()=>undefined).finally(()=>{if(!controller.signal.aborted&&this.streamController===controller){this.connected.set(false);this.reconnectTimer=setTimeout(()=>this.connect(),3000);}});}
  samples(){const data=this.telemetry();return data.length>300?data.slice(-300):data;}
  drsState(){const drs=this.latestTelemetry()?.drs;return drs==null?'—':drs>=10?'OPEN':'CLOSED';}
  modelLabel(type:string){return type.replaceAll('_',' ');}
  modelValue(item:LiveIntelligence){const o=item.output;if(item.modelType==='PIT_WINDOW')return `L${o['windowStart']}–${o['windowEnd']}`;if(item.modelType==='TYRE_DEGRADATION')return `${o['secondsPerLap']} s/lap`;if(item.modelType==='SAFETY_CAR'||item.modelType==='DNF')return `${Math.round(Number(o['probability'])*100)}%`;return String(o['recommended']??o['risk']??'Ready');}
  ngOnDestroy(){this.streamController?.abort();clearTimeout(this.refreshTimer);clearTimeout(this.reconnectTimer);}
}
