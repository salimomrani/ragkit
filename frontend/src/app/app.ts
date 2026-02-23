import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isAuthenticated = this.authService.isAuthenticated;

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
