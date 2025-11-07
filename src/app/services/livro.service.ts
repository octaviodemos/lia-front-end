import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LivroService {

  private apiUrl = 'http://localhost:3333/api/books';

  constructor(private http: HttpClient) { }

  getLivros(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getLivroById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  criarLivro(livroData: any): Observable<any> {
    return this.http.post(this.apiUrl, livroData);
  }
}