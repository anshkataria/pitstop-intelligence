import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-home', standalone: true, imports: [RouterLink, NavbarComponent],
  template: `
    <section class="hero">
      <app-navbar />
      <div class="hero__content">
        <h1>Race intelligence,<br>engineered from data.</h1>
        <p class="lede">Predict race outcomes, analyse pit-stop strategy and uncover performance patterns using machine learning.</p>
        <div class="actions"><a routerLink="/dashboard" class="primary">Open Dashboard</a><a routerLink="/races" class="secondary">View Race Calendar</a></div>
      </div>
      <div class="race-strip">
        <div><small>SEASON COVERAGE</small><strong>2020 – 2026</strong><span>Full results, every round</span></div>
        <div><small>LIVE INTELLIGENCE</small><strong>Timing &amp; strategy</strong><span>Telemetry as sessions run</span></div>
        <div><small>PREDICTIONS</small><strong>Finishing order</strong><span>Modelled from race history</span></div>
      </div>
    </section>`,
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
