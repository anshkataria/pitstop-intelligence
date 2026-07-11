import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  readonly scrolled = signal(false);
  readonly navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Race Analysis', path: '/race-analysis' },
    { label: 'Predictions', path: '/predictions' },
    { label: 'Drivers', path: '/drivers' },
  ];

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 20); }
}
