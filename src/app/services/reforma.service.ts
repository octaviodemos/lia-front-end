import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReformaService {

  private apiUrl = 'http://localhost:3333/api/repairs';

  constructor(private http: HttpClient) { }

  criarSolicitacao(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  getMinhasSolicitacoes(): Observable<any> {
    return this.http.get(`http://localhost:3333/api/repairs/my-requests`);
  }

  getAllSolicitacoes(): Observable<any> {
    return this.http.get('http://localhost:3333/api/repairs');
  }

  responderSolicitacao(id: string, status: string, resposta_admin?: string): Observable<any> {
    return this.http.patch(`http://localhost:3333/api/repairs/${id}/respond`, { status, resposta_admin });
  }
}