import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AvaliacaoIaOferta } from '../models/avaliacao-ia-oferta';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly baseUrl = 'http://localhost:3333/api/ai';

  constructor(private http: HttpClient) {}

  avaliarOfertaComIA(id_oferta: number): Observable<AvaliacaoIaOferta> {
    return this.http.post<AvaliacaoIaOferta>(`${this.baseUrl}/evaluate-offer/${id_oferta}`, {});
  }
}
