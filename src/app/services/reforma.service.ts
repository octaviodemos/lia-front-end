import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReformaService {

  private apiUrl = 'http://localhost:3333/api/repairs';

  constructor(private http: HttpClient) { }

  criarSolicitacao(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  getMinhasSolicitacoes(): Observable<any> {
    return this.http.get(`http://localhost:3333/api/repairs/my-requests`);
  }

  getAllSolicitacoes(): Observable<any> {
    return this.http.get('http://localhost:3333/api/repairs');
  }

  /**
   * Admin: list repairs with pagination and filters
   * Expected query params: page, limit, status, q, sort
   */
  getAdminRepairs(options?: { page?: number; limit?: number; status?: string; q?: string; sort?: string }): Observable<any> {
    const params: any = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.status) params.status = options.status;
    if (options?.q) params.q = options.q;
    if (options?.sort) params.sort = options.sort;
    return this.http.get('http://localhost:3333/api/admin/repairs', { params });
  }

  responderSolicitacao(id: string, status: string, resposta_admin?: string): Observable<any> {
    return this.http.patch(`http://localhost:3333/api/repairs/${id}/respond`, { status, resposta_admin });
  }
}