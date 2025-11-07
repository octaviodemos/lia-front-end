import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../../services/pedido.service';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-pedidos.html',
  styleUrls: ['./admin-pedidos.scss']
})
export class AdminPedidos implements OnInit {

  pedidos: any[] = [];
  statusOptions: string[] = ['Processando', 'Enviado', 'Entregue', 'Cancelado'];

  constructor(private pedidoService: PedidoService) { }

  ngOnInit(): void {
    this.carregarPedidos();
  }

  carregarPedidos(): void {
    this.pedidoService.getAllPedidos().subscribe({
      next: (data: any) => {
        this.pedidos = data;
      },
      error: (err: any) => console.error('Erro ao carregar pedidos', err)
    });
  }

  onStatusChange(event: any, pedidoId: string): void {
    const novoStatus = event.target.value;
    this.pedidoService.updateStatusPedido(pedidoId, novoStatus).subscribe({
      next: (response: any) => {
        console.log('Status atualizado!', response);
        const index = this.pedidos.findIndex(p => p.id_pedido === pedidoId);
        if (index !== -1) {
          this.pedidos[index] = response;
        }
      },
      error: (err: any) => console.error('Erro ao atualizar status', err)
    });
  }
}