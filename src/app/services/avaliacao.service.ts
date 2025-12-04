import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AvaliacaoService {

  private apiUrl = 'http://localhost:3333/api/books';

  constructor(private http: HttpClient) { }

  getAvaliacoesPorLivro(idLivro: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${idLivro}/avaliacoes`);
  }

  criarAvaliacao(idLivro: string, avaliacaoData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${idLivro}/avaliacoes`, avaliacaoData);
  }

  // Reações (like/dislike) para avaliações — endpoints unificados
  getReactions(resourceId: string) {
    return this.http.get(`${this.apiUrl.replace('/books','')}/avaliacoes/${resourceId}/reactions`);
  }

  postReaction(resourceId: string, type: 'LIKE' | 'DISLIKE') {
    return this.http.post(`${this.apiUrl.replace('/books','')}/avaliacoes/${resourceId}/reactions`, { type });
  }

  deleteReaction(resourceId: string) {
    return this.http.delete(`${this.apiUrl.replace('/books','')}/avaliacoes/${resourceId}/reactions`);
  }

  getAvaliacaoById(resourceId: string) {
    return this.http.get(`${this.apiUrl.replace('/books','')}/avaliacoes/${resourceId}`);
  }
  
  deleteAdminAvaliacao(resourceId: string) {
    return this.http.delete(`${this.apiUrl.replace('/books','')}/admin/avaliacoes/${resourceId}`);
  }
}