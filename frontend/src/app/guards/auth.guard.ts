import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export function authGuard(
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): ReturnType<CanActivateFn> {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  sessionStorage.setItem('redirectUrl', state.url);
  void router.navigate(['/login']);
  return false;
}
