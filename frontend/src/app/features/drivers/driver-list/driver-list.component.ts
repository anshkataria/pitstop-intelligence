import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-driver-list', standalone: true, imports: [RouterLink], template: `<section class="page"><h1>Drivers</h1><p>Browse the Formula 1 driver field and open a profile for detailed performance data.</p><a routerLink="/drivers/1" class="ps-btn-primary">View sample driver</a></section>`, styles: [`.ps-btn-primary{margin-top:20px}`] })
export class DriverListComponent {}
