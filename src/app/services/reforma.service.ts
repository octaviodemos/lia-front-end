import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class ReformaService {

  private apiUrl = 'http://localhost:3333/api/repairs';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  criarSolicitacao(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  getMinhasSolicitacoes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-requests`);
  }

  getAllSolicitacoes(): Observable<any> {
    // Only admins can access all requests
    if (!this.isAdmin()) {
      throw new Error('Acesso negado: apenas administradores podem visualizar todas as solicitações');
    }
    return this.http.get(this.apiUrl);
  }

  responderSolicitacao(id: string, status: string): Observable<any> {
    // Only admins can respond to requests
    if (!this.isAdmin()) {
      throw new Error('Acesso negado: apenas administradores podem responder solicitações');
    }
    return this.http.patch(`${this.apiUrl}/${id}/respond`, { status_solicitacao: status });
  }
}