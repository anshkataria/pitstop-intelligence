import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, House, ChartNoAxesCombined, Target, UserRound, CalendarDays, LogOut, UsersRound, Settings } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-intelligence-shell', standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  template: `<div class="shell"><aside><a routerLink="/" class="brand"><img src="/images/pitstop-logo-dark.svg" alt="Pitstop Intelligence"></a><nav>@for(item of menu;track item.path){<a [routerLink]="item.path" routerLinkActive="active"><lucide-icon [img]="item.icon" [size]="18" [strokeWidth]="1.6"/><span>{{item.label}}</span></a>}</nav><div class="account"><a routerLink="/account" routerLinkActive="active" class="profile"><lucide-icon [img]="settingsIcon" [size]="18" [strokeWidth]="1.6"/><span><strong>{{auth.user()?.displayName}}</strong><small>{{auth.user()?.email}}</small></span></a><button type="button" (click)="logout()"><lucide-icon [img]="logoutIcon" [size]="18" [strokeWidth]="1.6"/>Sign out</button></div></aside><main><ng-content/></main></div>`,
  styleUrl: './intelligence-shell.component.scss',
})
export class IntelligenceShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly logoutIcon = LogOut;
  readonly settingsIcon = Settings;
  readonly menu = [
    { icon: House, label: 'Overview', path: '/dashboard' }, { icon: CalendarDays, label: 'Races', path: '/races' },
    { icon: ChartNoAxesCombined, label: 'Race Analysis', path: '/race-analysis' }, { icon: Target, label: 'Predictions', path: '/predictions' },
    { icon: UserRound, label: 'Drivers', path: '/drivers' },
    { icon: UsersRound, label: 'Teams', path: '/teams' },
  ];

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
