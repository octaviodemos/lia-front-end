import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfertaVendaService {

  private apiUrl = 'http://localhost:3333/api/offers';

  constructor(private http: HttpClient) { }

  criarOferta(ofertaData: any): Observable<any> {
    return this.http.post(this.apiUrl, ofertaData);
  }

  getMinhasOfertas(): Observable<any> {
    return this.http.get(`http://localhost:3333/api/offers/my-offers`);
  }

  getAllOfertas(): Observable<any> {
    return this.http.get('http://localhost:3333/api/offers');
  }

  responderOferta(id: string, resposta: { status: string, resposta_admin?: string }): Observable<any> {
    return this.http.patch(`http://localhost:3333/api/offers/${id}/respond`, resposta);
  }
}