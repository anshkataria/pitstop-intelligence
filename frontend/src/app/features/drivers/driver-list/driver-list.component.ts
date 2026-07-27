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
      <div class="card table-card">
        @if (loading()) {
          <div class="state">Loading drivers…</div>
        } @else if (drivers().length === 0) {
          <div class="state">No drivers found.</div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Driver</th>
                <th>Reference</th>
                <th>Nationality</th>
                <th>Date of birth</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (d of drivers(); track d.id) {
                <tr>
                  <td>
                    <span class="avatar">{{ d.firstName[0] }}{{ d.lastName[0] }}</span
                    ><strong>{{ d.fullName }}</strong>
                  </td>
                  <td class="mono">{{ d.driverRef }}</td>
                  <td>{{ d.nationality || '—' }}</td>
                  <td>{{ d.dateOfBirth || '—' }}</td>
                  <td><a [routerLink]="['/drivers', d.id]">View profile</a></td>
                </tr>
              }
            </tbody>
          </table>
        }
        <footer class="pagination">
          <span>Page {{ page() + 1 }}</span>
          <div>
            <button (click)="load(page() - 1)" [disabled]="page() === 0">
              <lucide-icon [img]="left" [size]="16" /></button
            ><button (click)="load(page() + 1)" [disabled]="drivers().length < 10">
              <lucide-icon [img]="right" [size]="16" />
            </button>
          </div>
        </footer>
      </div></section
  ></app-intelligence-shell>`,
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
      .table-card {
        overflow: hidden;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 15px 18px;
        text-align: left;
        border-bottom: 1px solid var(--ps-border);
        font-size: 12px;
      }
      th {
        font: 500 9px var(--ps-font-mono);
        color: var(--ps-text-secondary);
      }
      .avatar {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        margin-right: 12px;
        border-radius: 50%;
        background: var(--ps-text);
        color: #fff;
        font: 600 9px var(--ps-font-mono);
      }
      td a {
        color: var(--ps-red);
        text-decoration: none;
      }
      .mono {
        font-family: var(--ps-font-mono);
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
  ngOnInit() {
    this.load(0);
  }
  load(page: number) {
    if (page < 0) return;
    this.store.dispatch(
      DriversActions.loadDrivers({ page, size: 10, search: this.search.trim() || undefined }),
    );
  }
}
