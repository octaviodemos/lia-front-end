import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { LivroService } from '../../services/livro.service';
import { BuscaService } from '../../services/busca.service';
import { LivroCard } from '../../components/livro-card/livro-card';

@Component({
  selector: 'app-loja',
  standalone: true,
  imports: [CommonModule, LivroCard],
  templateUrl: './loja.html',
  styleUrls: ['./loja.scss']
})
export class Loja implements OnInit, OnDestroy {

  livros: any[] = [];
  livrosFiltrados: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private livroService: LivroService,
    private buscaService: BuscaService
  ) { }

  ngOnInit(): void {
    this.carregarLivros();
    this.observarBusca();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarLivros(): void {
    this.livroService.getLivros().subscribe({
      next: (response: any) => {
        this.livros = response;
        this.livrosFiltrados = this.livros;
      },
      error: (err: any) => {
        console.error('❌ Erro ao carregar livros:', err);
      }
    });
  }

  /**
   * Observa mudanças no termo de busca e filtra os livros
   */
  private observarBusca(): void {
    this.buscaService.getSearchTerm()
      .pipe(takeUntil(this.destroy$))
      .subscribe((searchTerm: string) => {
        this.livrosFiltrados = this.buscaService.filtrarLivros(this.livros, searchTerm);
      });
  }

  testarAPI(): void {
    fetch('http://localhost:3333/api/books')
      .then(res => res.json())
      .then(data => {
      })
      .catch(err => console.error('❌ Erro no fetch:', err));
  }
}