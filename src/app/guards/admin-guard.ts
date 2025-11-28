import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated first
  if (!authService.isAuthenticated() || authService.isTokenExpired()) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user is admin
  if (authService.isAdmin()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};