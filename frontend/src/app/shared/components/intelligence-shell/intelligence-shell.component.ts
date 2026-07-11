import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, House, ChartNoAxesCombined, Target, UserRound, CalendarDays } from 'lucide-angular';

@Component({
  selector: 'app-intelligence-shell', standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `<div class="shell"><aside><a routerLink="/" class="brand"><img src="/images/pitstop-logo-dark.svg" alt="Pitstop Intelligence"></a><nav>@for(item of menu;track item.path){<a [routerLink]="item.path" routerLinkActive="active"><lucide-icon [img]="item.icon" [size]="18" [strokeWidth]="1.6"/><span>{{item.label}}</span></a>}</nav></aside><main><ng-content/></main></div>`,
  styleUrl: './intelligence-shell.component.scss',
})
export class IntelligenceShellComponent {
  readonly menu = [
    { icon: House, label: 'Overview', path: '/dashboard' }, { icon: CalendarDays, label: 'Races', path: '/races' },
    { icon: ChartNoAxesCombined, label: 'Race Analysis', path: '/race-analysis' }, { icon: Target, label: 'Predictions', path: '/predictions' },
    { icon: UserRound, label: 'Drivers', path: '/drivers' },
  ];
}
