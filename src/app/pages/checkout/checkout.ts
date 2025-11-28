import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { EnderecoService } from '../../services/endereco.service';
import { PedidoService } from '../../services/pedido.service';
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
  enderecoSelecionadoId: number = 0;
  loading: boolean = false;

  constructor(
    private cartService: CartService,
    private enderecoService: EnderecoService,
    private pedidoService: PedidoService,
    private router: Router
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

  selecionarEndereco(id: number): void {
    this.enderecoSelecionadoId = id;
  }

  finalizarCompra(): void {
    if (!this.enderecoSelecionadoId) {
      alert('Por favor, selecione um endereço de entrega.');
      return;
    }
    this.loading = true;

    this.pedidoService.confirmarPedido(this.enderecoSelecionadoId, 'cartao_credito').subscribe({
      next: (response: any) => {
        console.log('Pedido confirmado:', response);
        if (response && response.success) {
          this.router.navigate(['/pedido/sucesso']);
        } else {
          this.router.navigate(['/pedido/falha']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro ao confirmar pedido:', err);
        this.router.navigate(['/pedido/falha']);
        this.loading = false;
      }
    });
  }
}