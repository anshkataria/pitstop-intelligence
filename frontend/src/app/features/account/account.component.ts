import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LucideAngularModule, Eye, EyeOff, User, ShieldCheck } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { IntelligenceShellComponent } from '../../shared/components/intelligence-shell/intelligence-shell.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, IntelligenceShellComponent],
  template: `<app-intelligence-shell><div class="screen account-screen">
    <header class="screen-head"><div><p class="eyebrow">ACCOUNT</p><h1>Your workspace</h1><p>Identity and access settings for Pitstop Intelligence.</p></div></header>

    <div class="identity card">
      <div class="avatar">{{ initials() }}</div>
      <div><strong>{{ auth.user()?.displayName }}</strong><span>{{ auth.user()?.email }}</span></div>
      <span class="ps-badge" [class.ps-badge--warning]="auth.user()?.role === 'ADMIN'" [class.ps-badge--info]="auth.user()?.role !== 'ADMIN'">{{ auth.user()?.role === 'ADMIN' ? 'Administrator' : 'Analyst' }}</span>
    </div>

    <div class="settings-grid">
      <form class="card" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
        <div class="card-head"><div class="head-row"><span class="head-icon profile"><lucide-icon [img]="userIcon" [size]="16" /></span><div><p class="eyebrow">PROFILE</p><h2>Personal details</h2></div></div><p>Your email is the secure account identifier and cannot be changed here.</p></div>
        <label>Display name<input formControlName="displayName" autocomplete="name" /></label>
        <label>Email<input [value]="auth.user()?.email ?? ''" disabled /></label>
        <button class="btn-primary" type="submit" [disabled]="profileForm.invalid || savingProfile()">
          {{ savingProfile() ? 'Saving…' : 'Save profile' }}
        </button>
        @if (profileMessage()) { <p class="feedback" role="status">{{ profileMessage() }}</p> }
      </form>

      <form class="card" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
        <div class="card-head"><div class="head-row"><span class="head-icon security"><lucide-icon [img]="shieldIcon" [size]="16" /></span><div><p class="eyebrow">SECURITY</p><h2>Change password</h2></div></div><p>Changing your password signs out every active session.</p></div>
        <label>Current password
          <div class="password-field">
            <input [type]="showCurrent() ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password" />
            <button type="button" class="toggle-visibility" (click)="showCurrent.set(!showCurrent())" [attr.aria-label]="showCurrent() ? 'Hide password' : 'Show password'">
              <lucide-icon [img]="showCurrent() ? eyeOffIcon : eyeIcon" [size]="16" />
            </button>
          </div>
        </label>
        <label>New password
          <div class="password-field">
            <input [type]="showNew() ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password" />
            <button type="button" class="toggle-visibility" (click)="showNew.set(!showNew())" [attr.aria-label]="showNew() ? 'Hide password' : 'Show password'">
              <lucide-icon [img]="showNew() ? eyeOffIcon : eyeIcon" [size]="16" />
            </button>
          </div>
          <small class="hint">At least 8 characters.</small>
        </label>
        <label>Confirm new password
          <div class="password-field">
            <input [type]="showConfirm() ? 'text' : 'password'" formControlName="confirmPassword" autocomplete="new-password" />
            <button type="button" class="toggle-visibility" (click)="showConfirm.set(!showConfirm())" [attr.aria-label]="showConfirm() ? 'Hide password' : 'Show password'">
              <lucide-icon [img]="showConfirm() ? eyeOffIcon : eyeIcon" [size]="16" />
            </button>
          </div>
        </label>
        <button class="btn-primary" type="submit" [disabled]="passwordForm.invalid || savingPassword()">
          {{ savingPassword() ? 'Updating…' : 'Update password' }}
        </button>
        @if (passwordMessage()) { <p class="feedback error" role="alert">{{ passwordMessage() }}</p> }
      </form>
    </div>
  </div></app-intelligence-shell>`,
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly profileMessage = signal('');
  readonly passwordMessage = signal('');
  readonly showCurrent = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);
  readonly eyeIcon = Eye;
  readonly eyeOffIcon = EyeOff;
  readonly userIcon = User;
  readonly shieldIcon = ShieldCheck;
  readonly profileForm = new FormGroup({
    displayName: new FormControl(this.auth.user()?.displayName ?? '', [Validators.required, Validators.maxLength(120)]),
  });
  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  initials(): string {
    return (this.auth.user()?.displayName ?? 'PI').split(/\s+/).slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase()).join('');
  }

  saveProfile(): void {
    const displayName = this.profileForm.controls.displayName.value?.trim();
    if (!displayName || this.profileForm.invalid || this.savingProfile()) return;
    this.profileMessage.set('');
    this.savingProfile.set(true);
    this.auth.updateProfile({ displayName }).pipe(finalize(() => this.savingProfile.set(false)))
      .subscribe({
        next: () => this.profileMessage.set('Profile updated.'),
        error: () => this.profileMessage.set('Profile could not be updated.'),
      });
  }

  changePassword(): void {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (!currentPassword || !newPassword || !confirmPassword || this.passwordForm.invalid || this.savingPassword()) return;
    if (newPassword !== confirmPassword) {
      this.passwordMessage.set('New passwords do not match.');
      return;
    }
    this.passwordMessage.set('');
    this.savingPassword.set(true);
    this.auth.changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => this.savingPassword.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/sign-in'], { queryParams: { passwordChanged: 'true' } }),
        error: (error: HttpErrorResponse) => this.passwordMessage.set(
          error.status === 400 ? 'Current password is incorrect.' : 'Password could not be updated.',
        ),
      });
  }
}
