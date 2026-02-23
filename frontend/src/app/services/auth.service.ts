import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
}

const AUTH_TOKEN_STORAGE_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  readonly isAuthenticated = signal(false);
  readonly token = signal<string | null>(null);

  constructor() {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (storedToken) {
      this.token.set(storedToken);
      this.isAuthenticated.set(true);
    }

    effect(() => {
      const currentToken = this.token();
      if (currentToken) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, currentToken);
        return;
      }

      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    });
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password })
      .pipe(
        tap((response) => {
          this.token.set(response.access_token);
          this.isAuthenticated.set(true);
        }),
      );
  }

  logout(): void {
    this.token.set(null);
    this.isAuthenticated.set(false);
  }
}
