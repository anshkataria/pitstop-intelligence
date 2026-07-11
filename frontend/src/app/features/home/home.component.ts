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
        <div><small>NEXT RACE</small><strong>Monaco Grand Prix</strong><span>Circuit de Monaco</span></div>
        <div><small>RACE START</small><strong>26 May, 2024</strong><span>21:00 AEST</span></div>
        <div><small>TRACK CONDITIONS</small><strong><span class="sun">☼</span> Dry &nbsp;&nbsp; <em>24°C</em></strong></div>
      </div>
    </section>`,
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
