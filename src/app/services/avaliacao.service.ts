import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AvaliacaoService {

  private apiUrl = 'http://localhost:3333/api/livros';

  constructor(private http: HttpClient) { }

  getAvaliacoesPorLivro(idLivro: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${idLivro}/avaliacoes`);
  }

  criarAvaliacao(idLivro: string, avaliacaoData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${idLivro}/avaliacoes`, avaliacaoData);
  }
}