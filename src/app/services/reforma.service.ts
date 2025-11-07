import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReformaService {

  private apiUrl = 'http://localhost:3333/api/solicitacoes-reforma';

  constructor(private http: HttpClient) { }

  criarSolicitacao(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  getMinhasSolicitacoes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/minhas-solicitacoes`);
  }

  getAllSolicitacoes(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  responderSolicitacao(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/responder`, { status_solicitacao: status });
  }
}