import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3333/api';
  private tokenKey = 'lia_auth_token';
  private userKey = 'lia_user';

  constructor(private http: HttpClient) { }

  register(userData: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/auth/register`, userData); 
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.access_token) {
          localStorage.setItem(this.tokenKey, response.access_token);
          
          const userInfo = response.user || { 
            id: 'unknown', 
            email: credentials.email,
            tipo_usuario: 'cliente'
          };
          localStorage.setItem(this.userKey, JSON.stringify(userInfo));
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): any | null {
    try {
      const user = localStorage.getItem(this.userKey);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Erro ao recuperar dados do usuário:', error);
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user && user.tipo_usuario === 'admin';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true; // Se não conseguir decodificar, considera expirado
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}