import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PublicacaoService {

  private apiUrl = 'http://localhost:3333/api/publicacoes';

  constructor(private http: HttpClient) { }

  getPublicacoes(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  criarPublicacao(postData: any): Observable<any> {
    return this.http.post(this.apiUrl, postData);
  }

  getPublicacaoById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  criarComentario(idPublicacao: string, comentarioData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${idPublicacao}/comentarios`, comentarioData);
  }
}