import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `<main>
    <img src="/images/pitstop-logo-dark.svg" alt="Pitstop Intelligence" />
    <p>404</p>
    <h1>Lost on the circuit.</h1>
    <span>The page you requested doesn’t exist or has moved.</span
    ><a routerLink="/dashboard">Return to dashboard</a>
  </main>`,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f4f3ef;
      }
      main {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      img {
        width: 180px;
      }
      p {
        margin: 45px 0 0;
        color: #d92332;
        font: 600 13px var(--ps-font-mono);
      }
      h1 {
        margin: 14px 0;
        font-size: 45px;
      }
      span {
        color: #777;
      }
      a {
        margin-top: 30px;
        padding: 13px 18px;
        border-radius: 5px;
        background: #d92332;
        color: #fff;
        text-decoration: none;
        font-weight: 700;
      }
    `,
  ],
})
export class NotFoundComponent {}
