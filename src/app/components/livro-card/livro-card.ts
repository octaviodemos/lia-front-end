import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarrinhoService } from '../../services/carrinho.service';

@Component({
  selector: 'app-livro-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './livro-card.html',
  styleUrls: ['./livro-card.scss']
})
export class LivroCard {
  @Input() livro: any;

  constructor(private cartService: CarrinhoService) {}

  onImgError(event: any): void {
    try {
      (event.target as HTMLImageElement).src = 'assets/placeholder.svg';
    } catch (e) {
      // ignore
    }
  }

  adicionarAoCarrinho(): void {
    const estoque = this.livro?.estoque;
    if (this.livro && estoque) {
      const id_estoque = estoque.id_estoque;
      const preco = estoque.preco ? Number(String(estoque.preco).replace(',', '.')) || 0 : 0;
      const meta = {
        livroId: String(this.livro.id_livro ?? id_estoque),
        titulo: this.livro.titulo ?? 'Produto',
        autor: this.livro.autor?.nome ?? '',
        preco,
        imagemUrl: this.livro.capa_url ?? ''
      };

      this.cartService.adicionarItem(id_estoque, 1, meta).subscribe({
        next: (res: any) => {
          // Item adicionado com sucesso (backend ou local)
        },
        error: (err: any) => {
          console.error('Erro ao adicionar item ao carrinho:', err);
        }
      });
    }
  }
}