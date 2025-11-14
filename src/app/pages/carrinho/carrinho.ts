import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarrinhoService, ItemCarrinho } from '../../services/carrinho.service';

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrinho.html',
  styleUrls: ['./carrinho.scss']
})
export class Carrinho implements OnInit {

  cart: { items: ItemCarrinho[]; totalItens: number; total: number } | null = null;

  constructor(private carrinhoService: CarrinhoService) {}

  ngOnInit(): void {
    this.carrinhoService.getCarrinho().subscribe(items => {
      const total = items.reduce((s, it) => s + (it.preco * it.quantidade), 0);
      const totalItens = items.reduce((s, it) => s + it.quantidade, 0);
      this.cart = { items, totalItens, total };
    });
    
    // Só faz refresh do backend se não houver items locais (para não sobrescrever carrinho local)
    const carrinhoAtual = this.carrinhoService.getCarrinhoAtual();
    if (carrinhoAtual.length === 0) {
      this.carrinhoService.refreshCarrinho().subscribe({ next: () => {}, error: () => {} });
    }
  }

  formatarPreco(value: number): string {
    if (value == null || isNaN(value)) return '0,00';
    return value.toFixed(2).replace('.', ',');
  }

  incrementarQuantidade(livroId: string, atual: number): void {
    this.carrinhoService.atualizarQuantidade(livroId, atual + 1);
  }

  decrementarQuantidade(livroId: string, atual: number): void {
    this.carrinhoService.atualizarQuantidade(livroId, Math.max(0, atual - 1));
  }

  removerItem(livroId: string): void {
    this.carrinhoService.removerItem(livroId);
  }
}