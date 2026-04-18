import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CarrinhoService, ItemCarrinho } from '../../services/carrinho.service';

interface Cart {
  items: ItemCarrinho[];
  total: number;
  totalItens: number;
}

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrinho.html',
  styleUrls: ['./carrinho.scss']
})
export class Carrinho implements OnInit, OnDestroy {

  cart: Cart = {
    items: [],
    total: 0,
    totalItens: 0
  };

  private destroy$ = new Subject<void>();

  constructor(private carrinhoService: CarrinhoService) {}

  ngOnInit(): void {
    this.carregarCarrinho();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarCarrinho(): void {
    this.carrinhoService.getCarrinho()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (itens: ItemCarrinho[]) => {
          this.cart.items = itens;
          this.cart.total = this.carrinhoService.getValorTotal();
          this.cart.totalItens = this.carrinhoService.getTotalItens();
        },
        error: (err: Error) => {
          console.error('Erro ao carregar carrinho:', err);
        }
      });
  }

  removerItem(item: ItemCarrinho): void {
    if (confirm('Deseja remover este item do carrinho?')) {
      this.carrinhoService.removerItem(item);
    }
  }

  formatarPreco(preco: number): string {
    return preco.toFixed(2).replace('.', ',');
  }
}
