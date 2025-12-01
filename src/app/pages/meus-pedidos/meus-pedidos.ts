import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../services/pedido.service';
import { badgeClass, isApproved, getFriendlyLabel as getFriendlyLabelFn } from '../../utils/status-utils';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-meus-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './meus-pedidos.html',
  styleUrls: ['./meus-pedidos.scss']
})
export class MeusPedidos implements OnInit {

  pedidos: any[] = [];
  loading: boolean = true;
  
  constructor(private pedidoService: PedidoService) { }

  badgeClass = badgeClass;
  isApproved = isApproved;
  getFriendlyLabel = getFriendlyLabelFn;

  ngOnInit(): void {
    this.pedidoService.getMeusPedidos().subscribe({
      next: (response: any) => {
        const items = Array.isArray(response) ? response : (response?.data || response?.orders || response?.payload || []);
        this.pedidos = (items || []).map((p: any) => ({ ...p, displayTotal: this.computeDisplayTotal(p) }));
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro ao buscar pedidos:', err);
        this.loading = false;
      }
    });
  }

  private tryNumber(v: any): number | null {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.');
      const n = Number(cleaned);
      return isNaN(n) ? null : n;
    }
    return null;
  }

  private formatBRL(n: number): string {
    try {
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch {
      return 'R$ ' + n.toFixed(2);
    }
  }

  private computeDisplayTotal(p: any): string {
    if (!p) return '';
    let n = this.tryNumber(p.valor_total) ?? this.tryNumber(p.total) ?? this.tryNumber(p.amount) ?? this.tryNumber(p.amount_total) ?? this.tryNumber(p.valor);
    if (n == null) {
      const cents = this.tryNumber(p.amount_total) ?? this.tryNumber(p.total_cents) ?? this.tryNumber(p.amount_cents) ?? this.tryNumber(p.valor_cents);
      if (cents != null) n = Number((cents / 100).toFixed(2));
    }
    if (n == null && (p.itens_pedido || p.items || p.items_pedido || p.frontend_items)) {
      const items = p.itens_pedido || p.items || p.items_pedido || p.frontend_items;
      try {
        const s = (items || []).reduce((acc: number, it: any) => {
            const qty = Number(it.quantidade || it.quantity || 1);
            const up = this.tryNumber(it.preco_unitario) ?? this.tryNumber(it.preco) ?? this.tryNumber(it.unit_price) ?? this.tryNumber(it.unit_amount) ?? this.tryNumber(it.amount);
          if (up == null) return acc;
          if (up > 1000) return acc + (up / 100) * qty;
          return acc + up * qty;
        }, 0);
        if (s > 0) n = Number(s.toFixed(2));
      } catch {
        // ignore
      }
    }
    return n == null ? '' : this.formatBRL(n);
  }
}