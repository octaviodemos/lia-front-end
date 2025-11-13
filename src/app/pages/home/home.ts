import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LivroService } from '../../services/livro.service';
import { LivroCard } from '../../components/livro-card/livro-card';

interface Livro {
  id: string;
  titulo: string;
  autor: string;
  preco: number;
  imagemUrl?: string;
  categoria?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LivroCard, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit, OnDestroy {
  
  livros: Livro[] = [];
  private destroy$ = new Subject<void>();

  constructor(private livroService: LivroService) {}

  ngOnInit(): void {
    this.carregarLivrosDestaque();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarLivrosDestaque(): void {
    this.livroService.getLivros()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Livro[]) => {
          if (data && Array.isArray(data)) {
            this.livros = data.slice(0, 6);
          } else {
            console.warn('Dados de livros inválidos recebidos');
            this.livros = [];
          }
        },
        error: (err) => {
          console.error('Erro ao carregar livros para home:', err);
          this.livros = [];
        }
      });
  }
}