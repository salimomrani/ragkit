import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let router: Router;
  let authService: {
    token: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = {
      token: vi.fn(() => null),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add Authorization header when token present', async () => {
    authService.token.mockReturnValue('jwt-token');

    const req = new HttpRequest('GET', '/api/v1/logs');

    await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authInterceptor(req, (nextReq: HttpRequest<unknown>) => {
        expect(nextReq.headers.get('Authorization')).toBe('Bearer jwt-token');
        return of(new HttpResponse({ status: 200 }));
        }),
      ),
    );
  });

  it('should not add header when no token', async () => {
    authService.token.mockReturnValue(null);

    const req = new HttpRequest('GET', '/api/v1/logs');

    await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        authInterceptor(req, (nextReq: HttpRequest<unknown>) => {
        expect(nextReq.headers.has('Authorization')).toBe(false);
        return of(new HttpResponse({ status: 200 }));
        }),
      ),
    );
  });

  it('should logout and redirect on 401 response', async () => {
    const req = new HttpRequest('GET', '/api/v1/logs');

    await expect(
      firstValueFrom(
        TestBed.runInInjectionContext(() =>
          authInterceptor(req, () =>
            throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
          ),
        ),
      ),
    ).rejects.toBeTruthy();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
