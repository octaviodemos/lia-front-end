import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BuscaService {
  private searchTerm$ = new BehaviorSubject<string>('');

  constructor() { }

  setSearchTerm(term: string): void {
    this.searchTerm$.next(term.trim().toLowerCase());
  }

  getSearchTerm(): Observable<string> {
    return this.searchTerm$.asObservable();
  }

  clearSearch(): void {
    this.searchTerm$.next('');
  }

  filtrarLivros(livros: any[], searchTerm: string): any[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return livros;
    }

    const termo = searchTerm.toLowerCase();

    return livros.filter(livro => {
      const titulo = livro.titulo?.toLowerCase() || '';
      return titulo.includes(termo);
    });
  }
}
