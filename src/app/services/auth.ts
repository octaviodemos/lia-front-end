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
          
          // Extrair informações do token JWT
          let userInfo;
          try {
            const payload = JSON.parse(atob(response.access_token.split('.')[1]));
            console.log('JWT payload:', payload);
            
            // Fazer uma requisição adicional para buscar os dados completos do usuário
            this.getUserProfile().subscribe({
              next: (profile: any) => {
                console.log('User profile from API:', profile);
                localStorage.setItem(this.userKey, JSON.stringify(profile));
              },
              error: (error: any) => {
                console.error('Error fetching user profile:', error);
                // Fallback com dados do token
                userInfo = {
                  id: payload.sub,
                  email: payload.email,
                  tipo_usuario: 'cliente' // Será atualizado quando conseguirmos o perfil
                };
                localStorage.setItem(this.userKey, JSON.stringify(userInfo));
              }
            });
          } catch (error) {
            console.error('Error parsing JWT:', error);
            userInfo = { 
              id: 'unknown', 
              email: credentials.email,
              tipo_usuario: 'cliente'
            };
            localStorage.setItem(this.userKey, JSON.stringify(userInfo));
          }
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
    console.log('isAdmin check - user:', user);
    console.log('isAdmin check - tipo_usuario:', user?.tipo_usuario);
    console.log('isAdmin check - comparison result:', user?.tipo_usuario === 'admin');
    return user && user.tipo_usuario === 'admin';
  }

  getCurrentUserInfo(): any {
    const user = this.getUser();
    return {
      id: user?.id,
      nome: user?.nome,
      email: user?.email,
      tipo_usuario: user?.tipo_usuario
    };
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

  getUserProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/profile`);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}