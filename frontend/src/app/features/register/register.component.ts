import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main>
    <section class="visual">
      <a routerLink="/"><img src="/images/pitstop-logo.svg" alt="Pitstop Intelligence" /></a>
      <div>
        <p>YOUR RACE ROOM</p>
        <h1>See the race<br />before it unfolds.</h1>
        <span>Historical form, model confidence and race context in one workspace.</span>
      </div>
    </section>
    <section class="panel">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <a routerLink="/" class="mobile-logo">
          <img src="/images/pitstop-logo-dark.svg" alt="Pitstop Intelligence" />
        </a>
        <p class="eyebrow">CREATE YOUR WORKSPACE</p>
        <h2>Join Pitstop</h2>
        <p class="intro">Set up your private race-intelligence account.</p>

        <label>Display name
          <input formControlName="displayName" autocomplete="name" placeholder="Your name" />
        </label>
        <label>Email
          <input type="email" formControlName="email" autocomplete="email" placeholder="name@company.com" />
        </label>
        <label>Password
          <input type="password" formControlName="password" autocomplete="new-password" placeholder="At least 8 characters" />
        </label>
        <label>Confirm password
          <input type="password" formControlName="confirmPassword" autocomplete="new-password" placeholder="Repeat your password" />
        </label>
        <label class="remember"><input type="checkbox" formControlName="remember" /> Keep me signed in</label>

        <button class="submit" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Creating account…' : 'Create account' }}
        </button>
        @if (message()) { <p class="message" role="alert">{{ message() }}</p> }
        <p class="switch">Already have an account? <a routerLink="/sign-in">Sign in</a></p>
        <a routerLink="/" class="back">← Back to home</a>
      </form>
    </section>
  </main>`,
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly form = new FormGroup({
    displayName: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]),
    confirmPassword: new FormControl('', [Validators.required]),
    remember: new FormControl(true),
  });

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    const { displayName, email, password, confirmPassword, remember } = this.form.getRawValue();
    if (!displayName || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      this.message.set('Passwords do not match.');
      return;
    }

    this.message.set('');
    this.busy.set(true);
    this.auth.register({ displayName, email, password }, Boolean(remember))
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/dashboard'),
        error: (error: HttpErrorResponse) => this.message.set(
          error.status === 409
            ? 'An account already exists for this email.'
            : 'Registration is unavailable. Please try again.',
        ),
      });
  }
}
