import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstoqueService {

  private apiUrl = 'http://localhost:3333/api';

  constructor(private http: HttpClient) { }

  listarEstoque(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stock`);
  }

  adicionarItemEstoque(itemData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/stock`, itemData);
  }

  atualizarItemEstoque(
    id: number,
    itemData: { preco?: string; nota_conservacao?: number; disponivel?: boolean }
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/stock/${id}`, itemData);
  }

  excluirItemEstoque(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/stock/${id}`);
  }
}