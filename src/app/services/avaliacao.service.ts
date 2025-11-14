import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AvaliacaoService {

  private apiUrl = 'http://localhost:3333/api';

  constructor(private http: HttpClient) { }

  getAvaliacoesPorLivro(idLivro: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/books/${idLivro}/avaliacoes`);
  }

  criarAvaliacao(idLivro: string, avaliacaoData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/books/${idLivro}/avaliacoes`, avaliacaoData);
  }
}