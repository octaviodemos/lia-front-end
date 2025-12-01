import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../../services/pedido.service';
import { getFriendlyLabel, badgeClass } from '../../../utils/status-utils';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pedidos.html',
  styleUrls: ['./admin-pedidos.scss']
})
export class AdminPedidos implements OnInit {

  pedidos: any[] = [];
  total: number = 0;
  page: number = 1;
  perPage: number = 20;
  statusOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todos os status' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'PROCESSING', label: 'Em processamento' },
    { value: 'PAID', label: 'Pago' },
    { value: 'SHIPPED', label: 'Enviado' },
    { value: 'DELIVERED', label: 'Entregue' },
    { value: 'CANCELLED', label: 'Cancelado' }
  ];
  filterStatus: string = '';
  q: string = '';
  sort: string = 'data_pedido:desc';

  constructor(private pedidoService: PedidoService) { }

  getFriendlyLabel = (p: any) => getFriendlyLabel(p);
  badgeClassFor = (p: any) => badgeClass(p);

  // Determine which option value should be selected for a given pedido
  getSelectedStatusValue(pedido: any): string {
    const current = (pedido?.status_pedido || pedido?.status_pedido_label || '').toString();
    if (!current) return '';

    // try to match against known statusOptions values first (case-insensitive)
    const byValue = this.statusOptions.find(s => s.value && s.value.toString().toLowerCase() === current.toString().toLowerCase());
    if (byValue) return byValue.value;

    // try to match against labels
    const byLabel = this.statusOptions.find(s => s.label && s.label.toString().toLowerCase() === current.toString().toLowerCase());
    if (byLabel) return byLabel.value;

    // fallback: if current looks like a code with different case
    const byValueUpper = this.statusOptions.find(s => s.value && s.value.toString().toUpperCase() === current.toString().toUpperCase());
    if (byValueUpper) return byValueUpper.value;

    return '';
  }

  ngOnInit(): void {
    this.carregarPedidosAdmin();
  }

  carregarPedidosAdmin(): void {
    const opts = { page: this.page, limit: this.perPage, status: this.filterStatus || undefined, q: this.q || undefined, sort: this.sort };
    this.pedidoService.getAdminOrders(opts).subscribe({
      next: (res: any) => {
        // espera { items, total, page, perPage }
        this.pedidos = res?.items || [];
        this.total = res?.total || (Array.isArray(res) ? res.length : 0);
        this.page = res?.page || this.page;
        this.perPage = res?.perPage || this.perPage;
      },
      error: (err: any) => console.error('Erro ao carregar pedidos admin', err)
    });
  }

  onSearch() {
    this.page = 1;
    this.carregarPedidosAdmin();
  }

  changePage(next: number) {
    this.page = next;
    this.carregarPedidosAdmin();
  }

  onStatusChange(novoStatus: any, pedidoId: string): void {
    this.pedidoService.updateStatusPedido(pedidoId, novoStatus).subscribe({
      next: (response: any) => {
        console.log('Status atualizado!', response);
        // atualizar localmente
        const index = this.pedidos.findIndex(p => String(p.id_pedido) === String(pedidoId));
        if (index !== -1) {
          this.pedidos[index].status_pedido = response?.status_pedido || novoStatus;
          this.pedidos[index].status_pedido_label = response?.status_pedido_label || this.pedidos[index].status_pedido_label;
        }
        // garantir que a lista seja recarregada para refletir o estado do servidor
        // (alguns endpoints podem não retornar o objeto atualizado)
        setTimeout(() => this.carregarPedidosAdmin(), 250);
      },
      error: (err: any) => console.error('Erro ao atualizar status', err)
    });
  }
}