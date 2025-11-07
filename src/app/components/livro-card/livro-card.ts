import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-livro-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './livro-card.html',
  styleUrls: ['./livro-card.scss']
})
export class LivroCard {
  @Input() livro: any;

  constructor(private cartService: CartService) {}

  adicionarAoCarrinho(): void {
    if (this.livro && this.livro.estoque) {
      const id_estoque = this.livro.estoque.id_estoque;
      this.cartService.addItem(id_estoque, 1).subscribe({
        next: (res: any) => console.log('Item adicionado', res),
        error: (err: any) => console.error('Erro ao adicionar', err)
      });
    }
  }
}