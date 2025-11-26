import { Injectable } from '@angular/core';
import { AuthService } from '../services/auth';

@Injectable({
  providedIn: 'root'
})
export class AdminFunctionGuard {
  
  constructor(private authService: AuthService) {}

  /**
   * Checks if current user has admin privileges
   * Throws error if not admin, preventing function execution
   */
  requireAdmin(): void {
    if (!this.authService.isAdmin()) {
      throw new Error('Acesso negado: esta funcionalidade requer privilégios de administrador');
    }
  }

  /**
   * Returns true if user is admin, false otherwise
   * Use for conditional logic without throwing errors
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Returns user type or null if not logged in
   */
  getUserType(): string | null {
    const user = this.authService.getUser();
    return user?.tipo_usuario || null;
  }
}