import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { OfertaVenda } from '../models/oferta-venda';

@Injectable({
  providedIn: 'root'
})
export class OfertaVendaService {

  private apiUrl = 'http://localhost:3333/api/offers';

  constructor(private http: HttpClient) { }

  criarOferta(formData: FormData): Observable<OfertaVenda> {
    return this.http.post<OfertaVenda>(this.apiUrl, formData);
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