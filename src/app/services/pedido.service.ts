import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private apiUrl = 'http://localhost:3333/api/orders';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getMeusPedidos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-orders`);
  }

  getAllPedidos(): Observable<any> {
    // Only admins can access all orders
    if (!this.isAdmin()) {
      throw new Error('Acesso negado: apenas administradores podem visualizar todos os pedidos');
    }
    return this.http.get(this.apiUrl);
  }

  updateStatusPedido(id: string, status: string): Observable<any> {
    // Only admins can update order status
    if (!this.isAdmin()) {
      throw new Error('Acesso negado: apenas administradores podem alterar status de pedidos');
    }
    return this.http.patch(`${this.apiUrl}/${id}/status`, { status_pedido: status });
  }
}