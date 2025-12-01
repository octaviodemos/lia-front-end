import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private apiUrl = 'http://localhost:3333/api/pedidos';
  private apiUrlEn = 'http://localhost:3333/api/orders';
  private apiAdminOrders = 'http://localhost:3333/api/admin/orders';

  constructor(private http: HttpClient) { }

  getMeusPedidos(): Observable<any> {
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
      // Avoid sending custom Cache headers (can trigger CORS preflight failures).
      // Use a timestamp query param to bypass caches instead.
      const url = `${this.apiUrlEn}/my-orders?ts=${Date.now()}`;
      return this.http.get(url);
  }

  getAllPedidos(): Observable<any> {
    const urlAll = `${this.apiUrlEn}`;
    const urlMy = `${this.apiUrlEn}/my-orders`;
    return this.http.get(urlAll).pipe(
      catchError((err: any) => {
        if (err && err.status === 404) {
          console.warn('getAllPedidos: /api/orders não disponível, fallback para /api/orders/my-orders');
          return this.http.get(urlMy);
        }
        return throwError(() => err);
      })
    );
  }

  getPedido(id: string): Observable<any> {
    const url = `${this.apiUrlEn}/${id}`;
    return this.http.get(url);
  }

  /**
   * Tentativas alternativas de recuperar um pedido quando o backend expõe caminhos diferentes
   * Ex.: /api/orders/my-order/:id  ou /api/orders/my-order?id=
   */
  getPedidoAlternativo(id: string): Observable<any> {
    const url1 = `${this.apiUrlEn}/my-order/${encodeURIComponent(id)}`;
    const url2 = `${this.apiUrlEn}/my-order?id=${encodeURIComponent(id)}`;
    return this.http.get(url1).pipe(catchError(() => this.http.get(url2)));
  }

  /**
   * Busca de pedidos pela interface admin (paginada, filtros)
   * Retorna o formato { items, total, page, perPage }
   */
  getAdminOrders(options?: { page?: number; limit?: number; status?: string; q?: string; sort?: string }): Observable<any> {
    const params: any = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.status) params.status = options.status;
    if (options?.q) params.q = options.q;
    if (options?.sort) params.sort = options.sort;

    return this.http.get(this.apiAdminOrders, { params });
  }

  confirmarPedido(id_endereco: number, metodo_pagamento: string): Observable<any> {
    const url = `${this.apiUrlEn}/confirm`;
    return this.http.post(url, { id_endereco, metodo_pagamento });
  }

  /**
   * Atualiza o status de um pedido via endpoint admin.
   * Usa PATCH para `/api/admin/orders/:id/status` com body { status }
   */
  updateStatusPedido(id: string, status: string): Observable<any> {
    const url = `${this.apiAdminOrders}/${encodeURIComponent(id)}/status`;
    return this.http.patch(url, { status });
  }
}