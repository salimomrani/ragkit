import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { provideRouter, Router } from '@angular/router';

import { Login } from './login';
import { AuthService } from '../../services/auth.service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;
  let authService: { login: ReturnType<typeof vi.fn> };
  let sessionStorageMap: Map<string, string>;

  beforeEach(async () => {
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
      login: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should render username and password fields', () => {
    const usernameInput = fixture.nativeElement.querySelector(
      'input[name="username"]',
    ) as HTMLInputElement | null;
    const passwordInput = fixture.nativeElement.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement | null;

    expect(usernameInput).toBeTruthy();
    expect(passwordInput).toBeTruthy();
    expect(passwordInput?.type).toBe('password');
  });

  it('should show error on invalid credentials', () => {
    authService.login.mockReturnValue(
      throwError(() => ({ error: { detail: 'Invalid credentials' } })),
    );

    component.username.set('admin');
    component.password.set('wrong');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.error()).toBe('Invalid credentials');
    expect(fixture.nativeElement.textContent).toContain('Invalid credentials');
  });

  it('should call authService.login on submit', () => {
    authService.login.mockReturnValue(of({ access_token: 'token', token_type: 'bearer' }));

    component.username.set('admin');
    component.password.set('changeme');
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('admin', 'changeme');
  });

  it('should navigate to /chat on success', () => {
    authService.login.mockReturnValue(of({ access_token: 'token', token_type: 'bearer' }));

    component.username.set('admin');
    component.password.set('changeme');
    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/chat']);
  });
});
