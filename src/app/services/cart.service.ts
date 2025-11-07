import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  private apiUrl = 'http://localhost:3333/api/cart';

  constructor(private http: HttpClient) { }

  getCart(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  addItem(id_estoque: string, quantidade: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/items`, { id_estoque, quantidade });
  }
}