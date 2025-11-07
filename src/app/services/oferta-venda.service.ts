import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfertaVendaService {

  private apiUrl = 'http://localhost:3333/api/ofertas-venda';

  constructor(private http: HttpClient) { }

  criarOferta(ofertaData: any): Observable<any> {
    return this.http.post(this.apiUrl, ofertaData);
  }

  getMinhasOfertas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/minhas-ofertas`);
  }

  getAllOfertas(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  responderOferta(id: string, resposta: { status_oferta: string, resposta_admin: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/responder`, resposta);
  }
}