import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EstoqueService {

  private apiUrl = 'http://localhost:3333/api/stock';

  constructor(private http: HttpClient) { }

  adicionarItemEstoque(itemData: any): Observable<any> {
    return this.http.post(this.apiUrl, itemData);
  }
}