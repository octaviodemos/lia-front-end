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

  responderOferta(id: string, resposta: { status_oferta?: string, resposta_admin?: string }): Observable<any> {
    // backend expects `status_oferta` and `resposta_admin` in the body
    const body: any = {};
    if (resposta.status_oferta !== undefined) body.status_oferta = resposta.status_oferta;
    if (resposta.resposta_admin !== undefined) body.resposta_admin = resposta.resposta_admin;
    return this.http.patch(`http://localhost:3333/api/offers/${id}/respond`, body);
  }
}