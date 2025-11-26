import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnderecoService {

  private apiUrl = 'http://localhost:3333/api/addresses';

  constructor(private http: HttpClient) { }

  getEnderecos(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  addEndereco(endereco: any): Observable<any> {
    return this.http.post(this.apiUrl, endereco);
  }
}