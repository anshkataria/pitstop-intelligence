import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main>
    <section class="visual">
      <a routerLink="/"><img src="/images/pitstop-logo.svg" alt="Pitstop Intelligence" /></a>
      <div>
        <p>RACE INTELLIGENCE</p>
        <h1>Decisions at<br />race pace.</h1>
        <span>One view for the grid, the race and what comes next.</span>
      </div>
    </section>
    <section class="panel">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <a routerLink="/" class="mobile-logo"
          ><img src="/images/pitstop-logo-dark.svg" alt="Pitstop Intelligence"
        /></a>
        <p class="eyebrow">WELCOME BACK</p>
        <h2>Sign in</h2>
        <p class="intro">Access your race workspace.</p>
        <label
          >Email<input
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="name@company.com" /></label
        ><label
          >Password<input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            placeholder="Enter your password"
        /></label>
        <div class="options">
          <label><input type="checkbox" formControlName="remember" /> Remember me</label>
        </div>
        <button class="submit" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Signing in…' : 'Continue' }}
        </button>
        @if (message()) {
          <p class="message">{{ message() }}</p>
        }
        <p class="switch">New to Pitstop? <a routerLink="/register">Create an account</a></p>
        <a routerLink="/" class="back">← Back to home</a>
      </form>
    </section>
  </main>`,
  styles: [
    `
      :host {
        display: block;
        height: 100svh;
        overflow: hidden;
      }
      main {
        height: 100%;
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        background: #fff;
      }
      .visual {
        position: relative;
        padding: 42px 52px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: #fff;
        background:
          linear-gradient(90deg, rgba(4, 5, 6, 0.65), rgba(4, 5, 6, 0.15)),
          url('/assets/hero.png') 58% center/cover;
      }
      .visual > a img {
        width: 220px;
      }
      .visual > div {
        padding-bottom: 45px;
      }
      .visual p {
        color: #d92332;
        font: 600 10px var(--ps-font-mono);
        letter-spacing: 0.1em;
      }
      .visual h1 {
        margin: 14px 0 20px;
        font: 500 clamp(48px, 5vw, 74px)/1.02 var(--ps-font-heading);
        letter-spacing: -0.045em;
      }
      .visual span {
        font-size: 15px;
        color: rgba(255, 255, 255, 0.78);
      }
      .panel {
        display: grid;
        place-items: center;
        padding: 40px;
      }
      form {
        width: min(390px, 100%);
      }
      .mobile-logo {
        display: none;
      }
      .eyebrow {
        margin: 0;
        color: #d92332;
        font: 600 9px var(--ps-font-mono);
        letter-spacing: 0.1em;
      }
      h2 {
        margin: 12px 0 8px;
        font-size: 38px;
        font-weight: 500;
        letter-spacing: -0.035em;
      }
      .intro {
        margin: 0 0 34px;
        color: #777;
        font-size: 13px;
      }
      form > label {
        display: block;
        margin-top: 18px;
        color: #4c4e53;
        font-size: 11px;
      }
      form > label input {
        width: 100%;
        height: 48px;
        margin-top: 8px;
        padding: 0 14px;
        border: 1px solid #d9dadd;
        border-radius: 6px;
        outline: none;
        font: inherit;
      }
      form > label input:focus {
        border-color: #d92332;
        box-shadow: 0 0 0 3px rgba(217, 35, 50, 0.08);
      }
      .options {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 18px 0 25px;
        font-size: 10px;
      }
      .options label {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .submit {
        width: 100%;
        height: 48px;
        border: 0;
        border-radius: 5px;
        background: #d92332;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      .submit:disabled {
        opacity: 0.45;
      }
      .message {
        padding: 12px;
        border-radius: 5px;
        background: #f4f3ef;
        color: #666;
        font-size: 10px;
        text-align: center;
      }
      .back {
        display: block;
        margin-top: 22px;
        color: #555;
        font-size: 11px;
        text-align: center;
        text-decoration: none;
      }
      .switch {
        margin: 20px 0 0;
        color: #6e7074;
        font-size: 11px;
        text-align: center;
      }
      .switch a {
        color: #d92332;
        font-weight: 700;
        text-decoration: none;
      }
      @media (max-width: 760px) {
        main {
          grid-template-columns: 1fr;
        }
        .visual {
          display: none;
        }
        .panel {
          padding: 24px;
        }
        .mobile-logo {
          display: block;
          margin-bottom: 48px;
        }
        .mobile-logo img {
          width: 190px;
        }
      }
    `,
  ],
})
export class SignInComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly message = signal(
    this.route.snapshot.queryParamMap.has('passwordChanged')
      ? 'Password updated. Sign in with your new password.'
      : '',
  );
  readonly busy = signal(false);
  readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    remember: new FormControl(false),
  });
  submit(): void {
    if (this.form.invalid || this.busy()) return;
    const { email, password, remember } = this.form.getRawValue();
    if (!email || !password) return;
    this.message.set('');
    this.busy.set(true);
    this.auth.login({ email, password }, Boolean(remember))
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: HttpErrorResponse) => this.message.set(
          error.status === 401 ? 'Email or password is incorrect.'
            : 'Sign-in is unavailable. Check that the backend is running and try again.',
        ),
      });
  }
}
