import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({ selector: 'app-driver-profile', standalone: true, imports: [RouterLink], template: `<section class="page"><p>DRIVER {{ driverId }}</p><h1>Driver Profile</h1><p>Detailed driver statistics and race performance will appear here.</p><a routerLink="/drivers">Back to drivers</a></section>` })
export class DriverProfileComponent {
  private readonly route = inject(ActivatedRoute);
  readonly driverId = this.route.snapshot.paramMap.get('id');
}
