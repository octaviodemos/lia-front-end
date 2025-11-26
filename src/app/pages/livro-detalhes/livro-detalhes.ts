import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LivroService } from '../../services/livro.service';
import { CarrinhoService } from '../../services/carrinho.service';
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
    private cartService: CarrinhoService,
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
      const preco = estoque.preco ? Number(String(estoque.preco).replace(',', '.')) || 0 : 0;
      const autorNome = (this.livro.autores && this.livro.autores.length)
        ? this.livro.autores.map((a: any) => a.nome).join(', ')
        : (this.livro.autor?.nome ?? '');

      const meta = {
        livroId: String(this.livro.id_livro ?? id_estoque),
        titulo: this.livro.titulo ?? 'Produto',
        autor: autorNome,
        preco,
        imagemUrl: this.livro.capa_url ?? ''
      };

      this.cartService.adicionarItem(id_estoque, 1, meta).subscribe({
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