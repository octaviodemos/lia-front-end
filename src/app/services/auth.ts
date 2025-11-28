import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3333';
  private tokenKey = 'lia_auth_token';
  private userKey = 'lia_user';
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public loggedIn$ = this.loggedInSubject.asObservable();

  constructor(private http: HttpClient) { }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return null;
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/register`, userData); 
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/auth/profile`);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/login`, credentials).pipe(
      tap((response: any) => {
        console.log('Response do login:', response);
        
        // A API retorna tanto access_token quanto user na mesma resposta
        const token = response.access_token || response.token;
        const user = response.user;
        
        if (token) {
          localStorage.setItem(this.tokenKey, token);
          console.log('Token salvo:', token);
        }
        
        if (user) {
          localStorage.setItem(this.userKey, JSON.stringify(user));
          console.log('Usuário salvo:', user);
          console.log('É admin?', user.tipo_usuario === 'admin');
          this.loggedInSubject.next(true);
        } else {
          // Fallback: buscar perfil se user não vier na resposta
          this.getCurrentUser().subscribe({
            next: (profileUser: any) => {
              localStorage.setItem(this.userKey, JSON.stringify(profileUser));
              console.log('Usuário do perfil salvo:', profileUser);
              this.loggedInSubject.next(true);
            },
            error: (err: any) => {
              console.error('Erro ao buscar perfil:', err);
            }
          });
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): any | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user && user.tipo_usuario === 'admin';
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const now = Date.now() / 1000;
      return decoded.exp < now;
    } catch {
      return true;
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.loggedInSubject.next(false);
  }
}