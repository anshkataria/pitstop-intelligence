import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { LucideAngularModule, ArrowLeft, Flag, CalendarDays } from 'lucide-angular';
import { IntelligenceShellComponent } from '../../../shared/components/intelligence-shell/intelligence-shell.component';
import { DriversActions } from '../../../core/store/drivers/drivers.actions';
import {
  selectSelectedDriver,
  selectDriversLoading,
} from '../../../core/store/drivers/drivers.selectors';

@Component({
  selector: 'app-driver-profile',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen profile">
      <a routerLink="/drivers" class="back"><lucide-icon [img]="back" [size]="18" /> Drivers</a>
      @if (loading()) {
        <div class="card state">Loading driver…</div>
      } @else if (driver(); as d) {
        <header class="profile-hero card">
          <div class="portrait">{{ d.firstName[0] }}{{ d.lastName[0] }}</div>
          <div>
            <p class="eyebrow">DRIVER PROFILE</p>
            <h1>{{ d.fullName }}</h1>
            <p>
              <lucide-icon [img]="flag" [size]="14" />
              {{ d.nationality || 'Unknown nationality' }} &nbsp;
              <lucide-icon [img]="calendar" [size]="14" />
              {{ d.dateOfBirth || 'Unknown birth date' }}
            </p>
          </div>
        </header>
        <nav class="tabs">
          <a class="active">Overview</a><a>Stats</a><a>Performance</a><a>Career</a>
        </nav>
        <div class="profile-grid">
          <article class="card season">
            <h2>Current Season</h2>
            <div class="big-stats">
              <div><strong>—</strong><span>Points</span></div>
              <div><strong>—</strong><span>Wins</span></div>
              <div><strong>—</strong><span>Podiums</span></div>
            </div>
            <div class="small-stats">
              <span>Season results are not available yet.</span>
            </div>
          </article>
          <article class="card">
            <h2>Race forecast</h2>
            <p class="muted">
              Add this driver to a starting grid and forecast the result.
            </p>
            <a routerLink="/predictions" class="btn-primary">Create prediction</a>
          </article>
          <article class="card performance">
            <h2>Performance trend</h2>
            <div class="empty-chart"><span>No race history available.</span></div>
          </article>
        </div>
      }
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .back {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        color: #333;
        text-decoration: none;
        font-size: 12px;
      }
      .profile-hero {
        display: flex;
        align-items: center;
        gap: 26px;
        padding: 30px;
      }
      .portrait {
        display: grid;
        place-items: center;
        width: 120px;
        height: 120px;
        border-radius: 60px 60px 12px 12px;
        background: linear-gradient(145deg, #ff8c1a, #d92332);
        color: #fff;
        font: 600 28px var(--ps-font-mono);
      }
      .profile-hero h1 {
        margin: 8px 0;
        font-size: 38px;
      }
      .profile-hero p {
        display: flex;
        align-items: center;
        color: #666;
      }
      .tabs {
        display: flex;
        gap: 34px;
        padding: 0 20px;
        border-bottom: 1px solid #ddd;
      }
      .tabs a {
        padding: 18px 0;
        font-size: 11px;
      }
      .tabs .active {
        color: #d92332;
        border-bottom: 2px solid #d92332;
      }
      .profile-grid {
        display: grid;
        grid-template-columns: 1.3fr 0.7fr;
        gap: 18px;
        margin-top: 18px;
      }
      .profile-grid article {
        padding: 22px;
      }
      .season {
        grid-column: 1;
      }
      .big-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin: 30px 0;
        border-bottom: 1px solid #eee;
      }
      .big-stats div {
        padding-bottom: 22px;
      }
      .big-stats strong,
      .big-stats span {
        display: block;
      }
      .big-stats strong {
        font: 500 30px var(--ps-font-mono);
      }
      .big-stats span {
        font-size: 10px;
      }
      .small-stats {
        font-size: 11px;
        color: #777;
      }
      .performance {
        grid-column: 1/3;
      }
      .empty-chart {
        height: 170px;
        display: grid;
        place-items: center;
        background: linear-gradient(#eee 1px, transparent 1px) 0 0/100% 42px;
        color: #888;
        font-size: 11px;
      }
      .state {
        padding: 60px;
      }
      @media (max-width: 800px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
        .performance,
        .season {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class DriverProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private store = inject(Store);
  readonly driver = this.store.selectSignal(selectSelectedDriver);
  readonly loading = this.store.selectSignal(selectDriversLoading);
  readonly back = ArrowLeft;
  readonly flag = Flag;
  readonly calendar = CalendarDays;
  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.store.dispatch(DriversActions.loadDriverById({ id }));
  }
}
