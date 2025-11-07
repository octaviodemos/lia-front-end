import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private apiUrl = 'http://localhost:3333/api/pedidos';

  constructor(private http: HttpClient) { }

  getMeusPedidos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/meus-pedidos`);
  }

  getAllPedidos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  updateStatusPedido(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status_pedido: status });
  }
}