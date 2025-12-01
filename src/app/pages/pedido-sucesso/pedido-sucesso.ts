import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagamentoService } from '../../services/pagamento.service';
import { PedidoService } from '../../services/pedido.service';
import { badgeClass, isApproved, getFriendlyLabel as getFriendlyLabelFn } from '../../utils/status-utils';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-pedido-sucesso',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pedido-sucesso.html',
  styleUrl: './pedido-sucesso.scss'
})
export class PedidoSucesso implements OnInit {
  
  paymentStatus: string | null = null;
  carregando = true;
  dadosPagamento: any = null;
  polling = false;
  pollingMessage: string | null = null;
  foundOrder: any = null;
  pollingVisible = false;
  foundVisible = false;
  successVisible = false;
  private pollingAbort = false;
  private initialOrderIds = new Set<number | string>();
  private initialOrdersStatusMap: Record<string, string> = {};
  private readonly pollingTimeoutMs = 120000; // 2 minutes
  private readonly backoff = [2000, 3000, 5000, 10000];

  constructor(
    private route: ActivatedRoute,
    private pagamentoService: PagamentoService,
    private pedidoService: PedidoService
  ) { }

  badgeClass = badgeClass;
  isApproved = isApproved;
  getFriendlyLabel = getFriendlyLabelFn;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const sessionId = params['session_id'] || params['sessionId'];
      if (sessionId) {
        console.log('Stripe session_id encontrado:', sessionId);
        this.prepareInitialOrders().then(() => {
          if (!this.foundOrder) {
            this.startPollingFlow(sessionId);
          } else {
            console.log('Pedido já encontrado durante prepareInitialOrders, não iniciando polling.');
          }
        }).catch(() => {
          this.startPollingFlow(sessionId);
        });
        return;
      }

      this.carregando = false;
    });
  }

  private obterSessaoStripe(sessionId: string): void {
    this.pagamentoService.obterSessaoStripe(sessionId).subscribe({
      next: (sess) => {
        this.dadosPagamento = sess;
        this.carregando = false;
        console.log('Dados da sessão Stripe:', sess);
        const paymentStatus = (sess?.data?.payment_status) || (sess?.payment_status) || (sess?.data?.payment_intent?.status) || sess?.status;
        if (paymentStatus && String(paymentStatus).toLowerCase() === 'approved') {
          this.successVisible = false;
          setTimeout(() => this.successVisible = true, 10);
        }
      },
      error: (err) => {
        console.error('Erro ao obter sessão Stripe:', err);
        this.carregando = false;
      }
    });
  }

  private async prepareInitialOrders(): Promise<void> {
    try {
      const resp: any = await lastValueFrom(this.pedidoService.getMeusPedidos());
      const items = Array.isArray(resp) ? resp : (resp?.data || resp?.orders || []);
      (items || []).forEach((o: any) => {
        const id = o.id || o.id_pedido || o.order_id;
        const status = o.status_pedido || o.status || o.payment_status || '';
        if (id != null) {
          const key = String(id);
          this.initialOrderIds.add(id);
          this.initialOrdersStatusMap[key] = (status || '').toString().toLowerCase();
        }
      });
      // If any initial order is already in a paid-like status, treat it as found immediately
      const paidLike = (items || []).find((o: any) => {
        const status = (o.status_pedido || o.status || o.payment_status || '').toString().toLowerCase();
        return status === 'paid' || status === 'aprovado' || status === 'approved' || status === 'pago';
      });

      if (paidLike) {
        this.foundOrder = paidLike;
        this.polling = false;
        this.carregando = false;
        console.log('Pedido já estava confirmado ao preparar pedidos iniciais:', paidLike);
        this.foundVisible = false;
        setTimeout(() => this.foundVisible = true, 10);
      }
    } catch (e) {
      console.warn('Não foi possível obter pedidos iniciais:', e);
    }
  }

  private startPollingFlow(sessionId: string) {
    this.polling = true;
    this.pollingAbort = false;
    this.pollingMessage = 'Aguardando confirmação do pagamento...';
    // prepare UI transition
    this.pollingVisible = false;
    setTimeout(() => this.pollingVisible = true, 10);
    this.carregando = true;

    const start = Date.now();
    let attempt = 0;

    const loop = async () => {
      if (this.pollingAbort) return;
      const elapsed = Date.now() - start;
      if (elapsed > this.pollingTimeoutMs) {
        this.polling = false;
        this.carregando = false;
        this.pollingMessage = 'Pagamento recebido — confirmação em processamento. Verifique Meus Pedidos em alguns minutos.';
        return;
      }

      try {
        // Checa a sessão na API
        const sess: any = await lastValueFrom(this.pagamentoService.obterSessaoStripe(sessionId));
        console.log('Polling - sessão:', sess);

        const paymentStatus = (sess?.data?.payment_status) || (sess?.payment_status) || (sess?.data?.payment_intent?.status) || sess?.status;
        if (paymentStatus) {
          this.paymentStatus = paymentStatus;
        }

        // Sempre checar pedidos do usuário para ver se novo pedido foi criado
        const pedidosResp: any = await lastValueFrom(this.pedidoService.getMeusPedidos());
        const pedidos = Array.isArray(pedidosResp) ? pedidosResp : (pedidosResp?.data || pedidosResp?.orders || []);

        // Tenta localizar um pedido novo/paid que não estava na lista inicial
        const found = (pedidos || []).find((o: any) => {
          const id = o.id || o.id_pedido || o.order_id;
          const statusRaw = o.status_pedido || o.status || o.payment_status || '';
          const status = String(statusRaw || '').toLowerCase();
          const key = id != null ? String(id) : null;

          // If it's a new order that wasn't present initially, accept it when it has a paid-like status
          if (key && !this.initialOrdersStatusMap[key]) {
            return status === 'paid' || status === 'aprovado' || status === 'approved' || status === 'pago';
          }

          // If the order existed before, but its status changed to a paid-like status, accept it
          if (key && this.initialOrdersStatusMap[key]) {
            const prev = this.initialOrdersStatusMap[key];
            if (prev !== status && (status === 'paid' || status === 'aprovado' || status === 'approved' || status === 'pago')) {
              return true;
            }
          }

          return false;
        });

        if (found) {
          this.foundOrder = found;
          this.polling = false;
          this.carregando = false;
          this.pollingMessage = null;
          console.log('Pedido detectado via polling:', found);
          // animate found order panel
          this.foundVisible = false;
          setTimeout(() => this.foundVisible = true, 10);
          return;
        }

      } catch (e) {
        console.warn('Erro durante polling:', e);
        // continuar tentativas até o timeout
      }

      // aguarda backoff
      const delay = this.backoff[Math.min(attempt, this.backoff.length - 1)];
      attempt++;
      setTimeout(loop, delay);
    };

    loop();
  }

  manualCheckOrders() {
    // força uma checagem imediata sem depender do session_id
    (async () => {
      try {
        this.pollingMessage = 'Verificando pedidos...';
        const resp: any = await lastValueFrom(this.pedidoService.getMeusPedidos());
        const pedidos = Array.isArray(resp) ? resp : (resp?.data || resp?.orders || []);
        console.debug('manualCheckOrders - initialOrdersStatusMap:', this.initialOrdersStatusMap);
        console.debug('manualCheckOrders - fetched pedidos count:', (pedidos || []).length);

        const found = (pedidos || []).find((o: any) => {
          const id = o.id || o.id_pedido || o.order_id;
          const statusRaw = o.status_pedido || o.status || o.payment_status || '';
          const status = String(statusRaw || '').toLowerCase();

          // Accept any order that is in a paid-like status (covers existing or new orders)
          if (status === 'paid' || status === 'aprovado' || status === 'approved' || status === 'pago') {
            return true;
          }

          return false;
        });

        if (found) {
          this.foundOrder = found;
          this.polling = false;
          this.carregando = false;
          this.pollingMessage = null;
          console.log('Pedido detectado via manualCheckOrders:', found);
          this.foundVisible = false;
          setTimeout(() => this.foundVisible = true, 10);
        } else {
          // Debug: log fetched orders and statuses to help diagnose why none matched
          console.debug('manualCheckOrders - nenhum pedido detectado; pedidos:', (pedidos || []).map((o: any) => ({ id: o.id || o.id_pedido || o.order_id, status: (o.status_pedido || o.status || o.payment_status) }))); 
          this.pollingMessage = 'Nenhum pedido novo encontrado. Tente novamente em alguns instantes.';
        }
      } catch (e) {
        console.error('Erro ao verificar pedidos manualmente:', e);
        this.pollingMessage = 'Erro ao verificar pedidos. Tente novamente.';
      }
    })();
  }

  ngOnDestroy(): void {
    this.pollingAbort = true;
  }

  // Calcula total a partir de vários formatos possíveis
  computeOrderTotal(order: any): number {
    if (!order) return 0;
    const tryNumber = (v: any): number | null => {
      if (v == null) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const n = Number(cleaned);
        return isNaN(n) ? null : n;
      }
      return null;
    };

    let n = tryNumber(order.valor_total) ?? tryNumber(order.total) ?? tryNumber(order.amount) ?? tryNumber(order.amount_total);
    if (n == null) {
      const cents = tryNumber(order.amount_total) ?? tryNumber(order.total_cents) ?? tryNumber(order.amount_cents);
      if (cents != null) n = Number((cents / 100).toFixed(2));
    }

    if (n == null && (order.itens_pedido || order.items || order.items_pedido)) {
      const items = order.itens_pedido || order.items || order.items_pedido;
      try {
        const s = (items || []).reduce((acc: number, it: any) => {
          const qty = Number(it.quantidade || it.quantity || 1);
          const up = tryNumber(it.preco_unitario) ?? tryNumber(it.preco) ?? tryNumber(it.unit_price) ?? tryNumber(it.unit_amount) ?? tryNumber(it.amount);
          if (up == null) return acc;
          if (up > 1000) return acc + (up / 100) * qty;
          return acc + up * qty;
        }, 0);
        if (s > 0) n = Number(s.toFixed(2));
      } catch {
        // ignore
      }
    }

    return n == null ? 0 : n;
  }
}
