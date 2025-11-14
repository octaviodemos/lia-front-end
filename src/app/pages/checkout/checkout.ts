import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarrinhoService } from '../../services/carrinho.service';
import { EnderecoService } from '../../services/endereco.service';
import { PagamentoService } from '../../services/pagamento.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss']
})
export class Checkout implements OnInit {

  cart: any = null;
  enderecos: any[] = [];
  enderecoSelecionadoId: string = '';
  loading: boolean = false;

  constructor(
  private cartService: CarrinhoService,
    private enderecoService: EnderecoService,
    private pagamentoService: PagamentoService
  ) { }

  ngOnInit(): void {
    // "Assina" o estado local do carrinho e calcula uma estrutura compatível com o template
    this.cartService.getCarrinho().subscribe({
      next: (items: any[]) => {
        const mappedItems = items.map(i => ({
          livro: { titulo: i.titulo },
          quantidade: i.quantidade,
          preco_unitario: i.preco
        }));
        const total = mappedItems.reduce((s, it) => s + (it.preco_unitario * it.quantidade), 0);
        this.cart = { items: mappedItems, total };
      },
      error: (err: any) => console.error('Erro ao buscar carrinho', err)
    });

    // Tenta sincronizar com o back-end (sem efeito quando não autenticado)
    this.cartService.refreshCarrinho().subscribe({ next: () => {}, error: () => {} });

    this.enderecoService.getEnderecos().subscribe({
      next: (response: any) => this.enderecos = response,
      error: (err: any) => console.error('Erro ao buscar endereços', err)
    });
  }

  selecionarEndereco(id: string): void {
    this.enderecoSelecionadoId = id;
  }

  finalizarCompra(): void {
    if (!this.enderecoSelecionadoId) {
      alert('Por favor, selecione um endereço de entrega.');
      return;
    }
    this.loading = true;

    this.pagamentoService.criarPreferenciaPagamento(this.enderecoSelecionadoId).subscribe({
      next: (response: any) => {
        if (response && response.redirectUrl) {
          window.location.href = response.redirectUrl;
        } else {
          console.error('Resposta inválida do back-end');
          this.loading = false;
        }
      },
      error: (err: any) => {
        console.error('Erro ao criar preferência de pagamento:', err);
        this.loading = false;
      }
    });
  }
}