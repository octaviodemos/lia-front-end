import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

export interface Estado {
  id: number;
  sigla: string;
  nome: string;
}

export interface Municipio {
  id: number;
  nome: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnderecoUtilsService {
  private apiUrl = 'http://localhost:3333/api';

  constructor(private http: HttpClient) { }

  buscarCep(cep: string): Observable<CepResponse> {
    const cepLimpo = cep.replace(/\D/g, '');
    return this.http.get<CepResponse>(`${this.apiUrl}/utils/cep/${cepLimpo}`);
  }

  listarEstados(): Observable<Estado[]> {
    return this.http.get<Estado[]>(`${this.apiUrl}/utils/estados`);
  }

  listarMunicipios(uf: string): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(`${this.apiUrl}/utils/estados/${uf}/municipios`);
  }

  formatarCep(cep: string): string {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  validarCep(cep: string): boolean {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.length === 8;
  }
}