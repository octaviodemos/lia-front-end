import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class OfertaVendaService {

  private apiUrl = 'http://localhost:3333/api/offers';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  criarOferta(ofertaData: any): Observable<any> {
    return this.http.post(this.apiUrl, ofertaData);
  }

  getMinhasOfertas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-offers`);
  }

  getAllOfertas(): Observable<any> {
    // Only admins can access all offers
    if (!this.isAdmin()) {
      throw new Error('Acesso negado: apenas administradores podem visualizar todas as ofertas');
    }
    return this.http.get(this.apiUrl);
  }

  responderOferta(id: string, resposta: { status_oferta: string, resposta_admin: string }): Observable<any> {
    // Only admins can respond to offers
    if (!this.isAdmin()) {
      throw new Error('Acesso negado: apenas administradores podem responder ofertas');
    }
    return this.http.patch(`${this.apiUrl}/${id}/respond`, resposta);
  }
}