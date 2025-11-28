import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { normalizeLivro } from '../utils/normalize-livro';

@Injectable({
  providedIn: 'root'
})
export class LivroService {

  private apiUrl = 'http://localhost:3333/api';

  constructor(private http: HttpClient) { }

  getLivros(): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/books`).pipe(
      map(list => {
        console.log('\ud83d\udd0d API Response RAW (primeiro livro):', list[0]);
        const normalized = (list || []).map(item => normalizeLivro(item));
        console.log('\u2705 Ap\u00f3s normaliza\u00e7\u00e3o (primeiro livro):', normalized[0]);
        return normalized;
      })
    );
  }

  getLivroById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/books/${id}`).pipe(
      map(raw => normalizeLivro(raw))
    );
  }

  criarLivro(livroData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/books`, livroData);
  }
}