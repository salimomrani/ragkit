import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { App } from './app';
import { AuthService } from './services/auth.service';

describe('App', () => {
  let router: Router;
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAuthService = {
      isAuthenticated: vi.fn(() => false),
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show logout button when authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement | null;
    expect(button).toBeTruthy();
  });

  it('should call authService.logout on button click', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement;
    button.click();

    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should navigate to /login after logout', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement;
    button.click();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
