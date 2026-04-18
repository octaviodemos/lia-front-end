import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class EnderecoService {

  private apiUrl = 'http://localhost:3333/api/addresses';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  getEnderecos(): Observable<any> {
    return this.http.get(this.apiUrl, { headers: this.getAuthHeaders() });
  }

  addEndereco(endereco: any): Observable<any> {
    return this.http.post(this.apiUrl, endereco, { headers: this.getAuthHeaders() });
  }
}