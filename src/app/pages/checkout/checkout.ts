import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
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
    private cartService: CartService,
    private enderecoService: EnderecoService,
    private pagamentoService: PagamentoService
  ) { }

  ngOnInit(): void {
    this.cartService.getCart().subscribe({
      next: (response: any) => this.cart = response,
      error: (err: any) => console.error('Erro ao buscar carrinho', err)
    });

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