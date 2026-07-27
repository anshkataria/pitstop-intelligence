import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { LucideAngularModule, Search, ChevronLeft, ChevronRight } from 'lucide-angular';
import { IntelligenceShellComponent } from '../../../shared/components/intelligence-shell/intelligence-shell.component';
import { DriversActions } from '../../../core/store/drivers/drivers.actions';
import {
  selectAllDrivers,
  selectDriversLoading,
  selectDriversTotal,
  selectDriversPage,
} from '../../../core/store/drivers/drivers.selectors';
import { flagFor } from '../../../shared/utils/nationality-flag';

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell
    ><section class="screen">
      <header class="screen-head">
        <div>
          <p class="eyebrow">DRIVERS</p>
          <h1>The Grid</h1>
          <p>Search the driver roster.</p>
        </div>
        <span class="count">{{ total() }} drivers</span>
      </header>
      <div class="toolbar card">
        <label
          ><lucide-icon [img]="searchIcon" [size]="18" /><input
            [(ngModel)]="search"
            (keyup.enter)="load(0)"
            placeholder="Search drivers..." /></label
        ><button class="btn-primary" (click)="load(0)">Search</button>
      </div>
      @if (loading()) {
        <div class="card state">Loading drivers…</div>
      } @else if (drivers().length === 0) {
        <div class="card state">No drivers found.</div>
      } @else {
        <div class="driver-grid">
          @for (d of drivers(); track d.id) {
            <a class="card driver-card" [routerLink]="['/drivers', d.id]">
              <div class="avatar">
                {{ d.firstName[0] }}{{ d.lastName[0] }}
                @if (flagFor(d.nationality); as flag) {
                  <span class="flag">{{ flag }}</span>
                }
              </div>
              <strong>{{ d.fullName }}</strong>
              <span class="ref">{{ d.driverRef }}</span>
              <div class="meta">
                <span>{{ d.nationality || '—' }}</span>
                <span>{{ d.dateOfBirth || '—' }}</span>
              </div>
            </a>
          }
        </div>
      }
      <footer class="pagination card">
        <span>Page {{ page() + 1 }}</span>
        <div>
          <button (click)="load(page() - 1)" [disabled]="page() === 0">
            <lucide-icon [img]="left" [size]="16" /></button
          ><button (click)="load(page() + 1)" [disabled]="drivers().length < 10">
            <lucide-icon [img]="right" [size]="16" />
          </button>
        </div>
      </footer>
    </section></app-intelligence-shell
  >`,
  styles: [
    `
      .toolbar {
        display: flex;
        gap: 12px;
        padding: 14px;
        margin-bottom: 18px;
      }
      .toolbar label {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        height: 42px;
        padding: 0 14px;
        border: 1px solid var(--ps-border-strong);
        border-radius: var(--ps-radius-input);
      }
      .toolbar input {
        width: 100%;
        border: 0;
        outline: 0;
        font: inherit;
      }
      .count {
        padding: 8px 12px;
        border-radius: 20px;
        background: var(--ps-surface);
        border: 1px solid var(--ps-border-strong);
        font-size: 11px;
      }
      .driver-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 14px;
        margin-bottom: 18px;
      }
      .driver-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 24px 16px 20px;
        text-align: center;
        color: inherit;
        text-decoration: none;
        transition:
          transform var(--ps-transition),
          border-color var(--ps-transition);
      }
      .driver-card:hover {
        transform: translateY(-2px);
        border-color: var(--ps-red);
      }
      .avatar {
        position: relative;
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: var(--ps-text);
        color: #fff;
        font: 600 16px var(--ps-font-mono);
      }
      .flag {
        position: absolute;
        right: -4px;
        bottom: -4px;
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--ps-surface);
        box-shadow: var(--ps-shadow-card);
        font-size: 12px;
      }
      .driver-card strong {
        font-size: 14px;
      }
      .ref {
        color: var(--ps-text-muted);
        font: 500 10px var(--ps-font-mono);
      }
      .meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 4px;
        color: var(--ps-text-secondary);
        font-size: 10px;
      }
      .state {
        padding: 70px;
        text-align: center;
        color: var(--ps-text-secondary);
      }
      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 18px;
        font-size: 11px;
      }
      .pagination button {
        width: 34px;
        height: 32px;
        background: var(--ps-surface);
        border: 1px solid var(--ps-border-strong);
      }
      .pagination button:disabled {
        opacity: 0.35;
      }
    `,
  ],
})
export class DriverListComponent implements OnInit {
  private store = inject(Store);
  readonly drivers = this.store.selectSignal(selectAllDrivers);
  readonly loading = this.store.selectSignal(selectDriversLoading);
  readonly total = this.store.selectSignal(selectDriversTotal);
  readonly page = this.store.selectSignal(selectDriversPage);
  search = '';
  readonly searchIcon = Search;
  readonly left = ChevronLeft;
  readonly right = ChevronRight;
  readonly flagFor = flagFor;
  ngOnInit() {
    this.load(0);
  }
  load(page: number) {
    if (page < 0) return;
    this.store.dispatch(
      DriversActions.loadDrivers({ page, size: 12, search: this.search.trim() || undefined }),
    );
  }
}
