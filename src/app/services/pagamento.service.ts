import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PagamentoService {

  private apiUrl = 'http://localhost:3333/api/pagamentos';

  constructor(private http: HttpClient) { }

  criarPreferenciaPagamento(enderecoId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/criar-preferencia`, { enderecoId });
  }
}