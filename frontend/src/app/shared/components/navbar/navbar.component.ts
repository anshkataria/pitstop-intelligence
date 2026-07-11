import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  readonly scrolled = signal(false);
  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 20); }
}
