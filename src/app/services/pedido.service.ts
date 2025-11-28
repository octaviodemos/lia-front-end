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
    return this.http.get(`http://localhost:3333/api/orders/my-orders`);
  }

  getAllPedidos(): Observable<any> {
    return this.http.get('http://localhost:3333/api/orders');
  }

  confirmarPedido(id_endereco: number, metodo_pagamento: string): Observable<any> {
    return this.http.post(`http://localhost:3333/api/orders/confirm`, { 
      id_endereco, 
      metodo_pagamento 
    });
  }

  updateStatusPedido(id: string, status: string): Observable<any> {
    return this.http.post(`http://localhost:3333/api/orders/confirm`, { id_endereco: id, metodo_pagamento: status });
  }
}