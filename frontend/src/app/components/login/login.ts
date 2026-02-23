import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = signal('');
  password = signal('');
  isLoading = signal(false);
  error = signal<string | null>(null);

  onSubmit(): void {
    const username = this.username().trim();
    const password = this.password();

    if (!username || !password || this.isLoading()) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.authService.login(username, password).subscribe({
      next: () => {
        const redirectUrl = sessionStorage.getItem('redirectUrl') ?? '/chat';
        sessionStorage.removeItem('redirectUrl');
        this.isLoading.set(false);
        void this.router.navigate([redirectUrl]);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Login failed');
        this.isLoading.set(false);
      },
    });
  }
}
