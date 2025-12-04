import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminModerationService {
  private base = 'http://localhost:3333/api';

  constructor(private http: HttpClient) {}

  // Avaliações
  getPendingAvaliacoes(): Observable<any> {
    return this.http.get(`${this.base}/admin/avaliacoes/pending`);
  }

  approveAvaliacao(id: string): Observable<any> {
    return this.http.post(`${this.base}/admin/avaliacoes/${id}/approve`, {});
  }

  deleteAvaliacao(id: string): Observable<any> {
    return this.http.delete(`${this.base}/admin/avaliacoes/${id}`);
  }

  // Comentários em publicações
  getPendingComentarios(): Observable<any> {
    return this.http.get(`${this.base}/admin/publicacoes/comentarios/pending`);
  }

  approveComentario(id: string): Observable<any> {
    return this.http.post(`${this.base}/admin/publicacoes/comentarios/${id}/approve`, {});
  }

  deleteComentario(id: string): Observable<any> {
    return this.http.delete(`${this.base}/admin/publicacoes/comentarios/${id}`);
  }
}
