import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LivroService } from '../../services/livro.service';
import { CartService } from '../../services/cart.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { switchMap } from 'rxjs';
import { AvaliacaoForm } from '../../components/avaliacao-form/avaliacao-form';

@Component({
  selector: 'app-livro-detalhes',
  standalone: true,
  imports: [CommonModule, RouterLink, AvaliacaoForm],
  templateUrl: './livro-detalhes.html',
  styleUrls: ['./livro-detalhes.scss']
})
export class LivroDetalhes implements OnInit {

  livro: any = null;
  avaliacoes: any[] = [];
  livroId: string = '';

  constructor(
    private route: ActivatedRoute,
    private livroService: LivroService,
    private cartService: CartService,
    private avaliacaoService: AvaliacaoService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.livroId = params.get('id') || '';
        if (this.livroId) {
          this.carregarAvaliacoes();
          return this.livroService.getLivroById(this.livroId);
        }
        return [];
      })
    ).subscribe({
      next: (data: any) => this.livro = data,
      error: (err: any) => console.error('Erro ao carregar o livro:', err)
    });
  }

  // primary estoque helper — backend may return an array
  // no longer needed: service normalizes `estoque` to a single object

  carregarAvaliacoes(): void {
    this.avaliacaoService.getAvaliacoesPorLivro(this.livroId).subscribe({
      next: (data: any) => this.avaliacoes = data,
      error: (err: any) => console.error('Erro ao carregar avaliações:', err)
    });
  }

  onNovaAvaliacao(novaAvaliacao: any): void {
    this.avaliacoes.push(novaAvaliacao);
  }

  adicionarAoCarrinho(): void {
    const estoque = this.livro?.estoque;
    if (this.livro && estoque) {
      const id_estoque = estoque.id_estoque;
      this.cartService.addItem(id_estoque, 1).subscribe({
        next: (response: any) => console.log('Item adicionado ao carrinho!', response),
        error: (err: any) => console.error('Erro ao adicionar item:', err)
      });
    }
  }

  onImgError(event: any): void {
    try {
      (event.target as HTMLImageElement).src = 'assets/placeholder.svg';
    } catch (e) {
      // ignore
    }
  }
}