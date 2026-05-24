import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AvaliacaoIaOferta } from '../models/avaliacao-ia-oferta';
import type { IdentificacaoCapa } from '../models/identificacao-capa';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly baseUrl = 'http://localhost:3333/api/ai';

  constructor(private http: HttpClient) {}

  avaliarOfertaComIA(id_oferta: number): Observable<AvaliacaoIaOferta> {
    return this.http.post<AvaliacaoIaOferta>(`${this.baseUrl}/evaluate-offer/${id_oferta}`, {});
  }

  identificarCapa(arquivo: File): Observable<IdentificacaoCapa> {
    const formData = new FormData();
    formData.append('capa', arquivo, arquivo.name);
    return this.http.post<IdentificacaoCapa>(`${this.baseUrl}/identify-cover`, formData);
  }
}
