import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RecommendationsService {
  private readonly baseUrl = 'http://localhost:3333/api/recommendations';

  constructor(private readonly http: HttpClient) {}

  getSkoobRecommendations(): Observable<{ livros: unknown[] }> {
    return this.http.get<{ livros: unknown[] }>(`${this.baseUrl}/skoob`);
  }
}
