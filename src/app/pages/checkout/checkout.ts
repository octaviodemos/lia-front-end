import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarrinhoService } from '../../services/carrinho.service';
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
  private cartService: CarrinhoService,
    private enderecoService: EnderecoService,
    private pedidoService: PedidoService,
    private router: Router
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