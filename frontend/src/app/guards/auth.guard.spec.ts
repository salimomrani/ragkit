import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let router: Router;
  let authService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let sessionStorageMap: Map<string, string>;

  beforeEach(() => {
    sessionStorageMap = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStorageMap.set(key, value);
      },
      removeItem: (key: string) => {
        sessionStorageMap.delete(key);
      },
      clear: () => {
        sessionStorageMap.clear();
      },
    });

    authService = {
      isAuthenticated: vi.fn(() => false),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should allow navigation when authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result: boolean = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/chat' } as never),
    ) as boolean;

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to /login when not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result: boolean = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/logs' } as never),
    ) as boolean;

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should store redirectUrl in sessionStorage', () => {
    authService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/eval' } as never));

    expect(sessionStorage.getItem('redirectUrl')).toBe('/eval');
  });
});
