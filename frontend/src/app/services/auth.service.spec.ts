import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock?.verify();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  const flushEffects = () => {
    // Angular testbed exposes this in recent versions; keep fallback no-op for compatibility.
    (TestBed as typeof TestBed & { flushEffects?: () => void }).flushEffects?.();
  };

  it('should initialize from localStorage', () => {
    localStorage.setItem('auth_token', 'persisted-token');

    const reloaded = TestBed.runInInjectionContext(() => new AuthService());

    expect(reloaded.token()).toBe('persisted-token');
    expect(reloaded.isAuthenticated()).toBe(true);
  });

  it('should set isAuthenticated on login', () => {
    let completed = false;

    service.login('admin', 'changeme').subscribe({
      complete: () => {
        completed = true;
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'admin', password: 'changeme' });

    req.flush({ access_token: 'jwt-token', token_type: 'bearer' });
    flushEffects();

    expect(completed).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('jwt-token');
  });

  it('should persist token to localStorage', () => {
    service.login('admin', 'changeme').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush({ access_token: 'jwt-token', token_type: 'bearer' });
    flushEffects();

    expect(localStorage.getItem('auth_token')).toBe('jwt-token');
  });

  it('should clear token on logout', () => {
    service.login('admin', 'changeme').subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({
      access_token: 'jwt-token',
      token_type: 'bearer',
    });
    flushEffects();

    service.logout();
    flushEffects();

    expect(service.token()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('auth_token')).toBeNull();
  });
});
