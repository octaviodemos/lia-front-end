import { Component, OnInit } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { badgeClass, isApproved, getFriendlyLabel as getFriendlyLabelFn } from '../../utils/status-utils';
import { LivroService } from '../../services/livro.service';

@Component({
  selector: 'app-pedido-detalhes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pedido-detalhes.html',
  styleUrls: ['./pedido-detalhes.scss']
})
export class PedidoDetalhes implements OnInit {
  pedido: any = null;
  carregando = true;
  erro: string | null = null;
  displayTotal: string = '';
  rawResponse: any = null;

  constructor(
    private route: ActivatedRoute,
    private pedidoService: PedidoService
    , private livroService: LivroService
  ) { }

  badgeClass = badgeClass;
  isApproved = isApproved;
  getFriendlyLabel = getFriendlyLabelFn;

  ngOnInit(): void {
    console.log('PedidoDetalhes ngOnInit - route params:', this.route.snapshot.paramMap);
    const id = this.route.snapshot.paramMap.get('id');
      const navState: any = history.state || {};
      console.log('PedidoDetalhes navState:', navState);
      if (navState && navState.pedido) {
        this.pedido = navState.pedido;
        this.normalizeItemsForDisplay(this.pedido);
        this.carregando = false;
        this.computeDisplayTotal();
        return;
      }

      if (!id) {
        this.erro = 'ID do pedido não informado.';
        this.carregando = false;
        return;
      }

      this.loadPedido(id);
  }

  loadPedido(id: string) {
    console.log('loadPedido called for id=', id);
    this.carregando = true;
    this.erro = null;

    this.pedidoService.getPedido(id).subscribe({
      next: (resp: any) => {
        console.log('getPedido next response:', resp);
        // Guardar resposta bruta para debugging
        this.rawResponse = resp;

        const normalized = this.normalizePedidoResponse(resp);
        if (!normalized) {
          console.warn('Resposta do servidor não contém pedido esperado:', resp);
            console.log('Fallback: tentando localizar pedido na lista de meus pedidos, id=', id);
            this.tryFindInMyOrders(id).then(found => {
              console.log('Fallback result for id=', id, 'found=', found);
              if (!found) {
                this.erro = 'Resposta do servidor inválida para este pedido.';
                this.carregando = false;
              }
            }).catch((e) => {
              console.error('Fallback erro ao buscar meus pedidos:', e);
              this.erro = 'Resposta do servidor inválida para este pedido.';
              this.carregando = false;
            });
          return;
        }

        this.pedido = normalized;
        this.normalizeItemsForDisplay(this.pedido);
        this.computeDisplayTotal();
        this.carregando = false;
      },
      error: (err: any) => {
        console.error('Erro ao buscar pedido:', err);

        // Monta mensagem útil para debug/UX
        let detalhes = 'Erro ao carregar os detalhes do pedido.';
        try {
          const status = err?.status;
          const serverMsg = err?.error?.message || err?.error || err?.message || '';
          detalhes = `Status: ${status || 'desconhecido'} - ${serverMsg}`;
        } catch (e) {
          // ignore
        }
        // Se não encontrado (404) ou erro de CORS, tenta obter lista de pedidos como fallback
        this.erro = detalhes;
        this.tryFindInMyOrders(id).then(found => {
          if (!found) {
            this.carregando = false;
          }
        }).catch(() => {
          this.carregando = false;
        });
      }
    });
  }

  retry() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadPedido(id);
  }
  
  private normalizePedidoResponse(resp: any): any {
    if (!resp) return null;

    // Direct shapes
    if (resp.id || resp.id_pedido || resp.order_id) return resp;
    if (Array.isArray(resp) && resp.length === 1) return resp[0];

    const id = this.route.snapshot.paramMap.get('id');
    if (Array.isArray(resp) && resp.length > 1) {
      const found = resp.find((o: any) => String(o.id || o.id_pedido || o.order_id) === String(id));
      if (found) return found;
    }

    // Common envelopes
    if (resp.data) {
      if (resp.data.id || resp.data.id_pedido || resp.data.order_id) return resp.data;
      if (Array.isArray(resp.data) && resp.data.length > 0) {
        const found = resp.data.find((o: any) => String(o.id || o.id_pedido || o.order_id) === String(id));
        if (found) return found;
        return resp.data[0];
      }
    }

    if (resp.order) return resp.order;
    if (resp.pedido) return resp.pedido;

    if (resp.payload) {
      if (Array.isArray(resp.payload) && resp.payload.length > 0) return resp.payload[0];
      if (resp.payload.order) return resp.payload.order;
      if (resp.payload.pedido) return resp.payload.pedido;
    }

    // Recursive search: try to find an object that looks like an order anywhere in the response
    const tryFindOrder = (obj: any, depth = 0): any | null => {
      if (!obj || typeof obj !== 'object' || depth > 6) return null;
      // direct match
      if (obj.id || obj.id_pedido || obj.order_id) return obj;
      if (obj.pedido && typeof obj.pedido === 'object') return obj.pedido;

      for (const k of Object.keys(obj)) {
        const val = obj[k];
        if (Array.isArray(val)) {
          for (const el of val) {
            const r = tryFindOrder(el, depth + 1);
            if (r) return r;
          }
        } else if (val && typeof val === 'object') {
          const r = tryFindOrder(val, depth + 1);
          if (r) return r;
        }
      }
      return null;
    };

    const foundRecursive = tryFindOrder(resp, 0);
    if (foundRecursive) return foundRecursive;

    // Last resort: single-key envelope
    const keys = Object.keys(resp || {});
    if (keys.length === 1) {
      const maybe = resp[keys[0]];
      if (maybe && (maybe.id || maybe.id_pedido || maybe.order_id)) return maybe;
    }

    return null;
  }

  private async tryFindInMyOrders(id: string): Promise<boolean> {
    try {
      const resp: any = await lastValueFrom(this.pedidoService.getMeusPedidos());
      console.log('tryFindInMyOrders - resposta getMeusPedidos raw:', resp);
      this.rawResponse = resp;
      const items = Array.isArray(resp) ? resp : (resp?.data || resp?.orders || resp?.payload || []);
      const found = (items || []).find((o: any) => String(o.id || o.id_pedido || o.order_id) === String(id));
      console.log('tryFindInMyOrders - procurando id=', id, 'achou=', !!found);
      if (found) {
        this.pedido = found;
        this.normalizeItemsForDisplay(this.pedido);
        this.computeDisplayTotal();
        this.carregando = false;
        this.erro = null;
        return true;
      }
      
      // Se não encontrou, tentar rota alternativa que alguns backends expõem
      try {
        console.log('tryFindInMyOrders - tentando rota alternativa /api/orders/my-order');
        const altResp: any = await lastValueFrom(this.pedidoService.getPedidoAlternativo(id));
        console.log('tryFindInMyOrders - resposta alternativa:', altResp);
        this.rawResponse = altResp;
        const normalized = this.normalizePedidoResponse(altResp);
        if (normalized) {
          this.pedido = normalized;
          this.normalizeItemsForDisplay(this.pedido);
          this.computeDisplayTotal();
          this.carregando = false;
          this.erro = null;
          return true;
        }
      } catch (altErr) {
        console.warn('tryFindInMyOrders - rota alternativa falhou:', altErr);
      }
      return false;
    } catch (e) {
      console.warn('Fallback getMeusPedidos falhou:', e);
      return false;
    }
  }

  private computeDisplayTotal() {
    if (!this.pedido) {
      this.displayTotal = '';
      return;
    }

    // Possíveis campos: total, total_pedido, amount_total (centavos), amount, valor, total_value
    const p: any = this.pedido;

    // If the order was already annotated with a displayTotal (from meus-pedidos), prefer it
    if (typeof p.displayTotal === 'string' && p.displayTotal.trim()) {
      this.displayTotal = p.displayTotal;
      return;
    }
    const tryNumber = (v: any): number | null => {
      if (v == null) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const n = Number(cleaned);
        return isNaN(n) ? null : n;
      }
      // handle Decimal-like objects (e.g., { s:1, e:1, d:[49,9000000] })
      if (typeof v === 'object') {
        try {
          // If object has toNumber or toString methods
          if (typeof (v as any).toNumber === 'function') {
            const n = (v as any).toNumber();
            return typeof n === 'number' && !isNaN(n) ? n : null;
          }
          if (typeof (v as any).toString === 'function') {
            const s = (v as any).toString();
            const cleaned = s.replace(/[^0-9.,-]/g, '').replace(',', '.');
            const n = Number(cleaned);
            if (!isNaN(n)) return n;
          }

          // Prism/decimal-like internal representation: d (chunks), e (exponent), s (sign)
          if (Array.isArray((v as any).d) && typeof (v as any).e === 'number') {
            const dArr: any[] = (v as any).d;
            // build digit string: first chunk as-is, subsequent chunks padded to 7 digits
            const pieces = dArr.map((chunk, idx) => {
              const sChunk = String(chunk);
              return idx === 0 ? sChunk : sChunk.padStart(7, '0');
            });
            const digitsStr = pieces.join('');
            const digitsLen = digitsStr.length;
            const exponent = (v as any).e;
            const sign = (v as any).s === -1 ? -1 : 1;
            const bigInt = Number(digitsStr);
            if (!isNaN(bigInt)) {
              const value = sign * bigInt * Math.pow(10, exponent - (digitsLen - 1));
              return Number(value);
            }
          }
        } catch {
          // fallthrough
        }
      }
      return null;
    };

    const tryNumberMaybeCents = (v: any): number | null => {
      const n = tryNumber(v);
      if (n == null) return null;
      // heuristic: if looks like integer cents (> 1000 and no decimal part), treat as cents
      if (Number.isInteger(n) && n > 1000) {
        return Number((n / 100).toFixed(2));
      }
      return n;
    };

    // Helper: search common fields (shallow and one-level nested) for numeric values
    const findNumericField = (obj: any, keys: string[]) : number | null => {
      if (!obj || typeof obj !== 'object') return null;
      for (const k of keys) {
        if (k in obj) {
          const v = tryNumberMaybeCents(obj[k]);
          if (v != null) return v;
        }
      }
      // check common nested containers
      const nests = ['pagamento','payment','payment_intent','pagamentos','data','result','order','pedido'];
      for (const n of nests) {
        if (obj[n] && typeof obj[n] === 'object') {
          for (const k of keys) {
            if (k in obj[n]) {
              const v = tryNumberMaybeCents(obj[n][k]);
              if (v != null) return v;
            }
          }
        }
      }
      // fallback: search any key that contains 'valor'|'total'|'amount'|'price'|'preco'
      const candidates = Object.keys(obj);
      for (const c of candidates) {
        if (/valor|total|amount|price|preco/i.test(c)) {
          const v = tryNumberMaybeCents(obj[c]);
          if (v != null) return v;
        }
      }
      return null;
    };
    // 1) explicit total candidates
    const totalKeys = ['valor_total','valor_pago','valor','total','total_pedido','total_value','amount_total','amount','payment_amount','amount_paid'];
    let n = findNumericField(p, totalKeys);

    // 2) try to sum items if available
    if (n == null && (p.itens_pedido || p.items || p.items_pedido || p.frontend_items || p.itens)) {
      const items = p.itens_pedido || p.items || p.items_pedido || p.frontend_items || p.itens;
      try {
        const s = (items || []).reduce((acc: number, it: any) => {
          const qty = Number(it.quantidade || it.quantity || it.qty || 1);
          const up = tryNumberMaybeCents(it.preco_unitario ?? it.preco ?? it.unit_price ?? it.price ?? it.unit_amount ?? it.amount_total ?? it.unit_amount_cents ?? it.valor);
          if (up == null) return acc;
          return acc + up * qty;
        }, 0);
        if (s > 0) n = Number(s.toFixed(2));
      } catch {
        // ignore
      }
    }

    if (n == null) {
      this.displayTotal = '';
    } else {
      this.displayTotal = this.formatBRL(n);
    }
  }

  // Normalize items so template can display numeric unit price and subtotal
  private normalizeItemsForDisplay(pedido: any) {
    if (!pedido) return;
    const items = pedido.itens_pedido || pedido.items || pedido.itens || pedido.items_pedido || pedido.frontend_items;
    if (!items || !Array.isArray(items)) return;

    const tryNumber = (v: any): number | null => {
      if (v == null) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9.,-]/g, '').replace(',', '.');
        const n = Number(cleaned);
        return isNaN(n) ? null : n;
      }
      if (typeof v === 'object') {
        try {
          if (typeof (v as any).toNumber === 'function') {
            const n = (v as any).toNumber();
            return typeof n === 'number' && !isNaN(n) ? n : null;
          }
          if (typeof (v as any).toString === 'function') {
            const s = (v as any).toString();
            const cleaned = s.replace(/[^0-9.,-]/g, '').replace(',', '.');
            const n = Number(cleaned);
            if (!isNaN(n)) return n;
          }
          if (Array.isArray((v as any).d) && typeof (v as any).e === 'number') {
            const dArr: any[] = (v as any).d;
            const pieces = dArr.map((chunk, idx) => {
              const sChunk = String(chunk);
              return idx === 0 ? sChunk : sChunk.padStart(7, '0');
            });
            const digitsStr = pieces.join('');
            const digitsLen = digitsStr.length;
            const exponent = (v as any).e;
            const sign = (v as any).s === -1 ? -1 : 1;
            const bigInt = Number(digitsStr);
            if (!isNaN(bigInt)) {
              const value = sign * bigInt * Math.pow(10, exponent - (digitsLen - 1));
              return Number(value);
            }
          }
        } catch {
          // ignore
        }
      }
      return null;
    };

    const tryNumberMaybeCents = (v: any): number | null => {
      // Handles nested objects and numeric-in-cents heuristics
      if (v == null) return null;
      if (typeof v === 'object') {
        // First, try to parse the object itself (handles Decimal-like objects)
        const direct = tryNumber(v);
        if (direct != null) return Number.isInteger(direct) && direct > 1000 ? Number((direct/100).toFixed(2)) : direct;
        // try common nested numeric keys
        for (const k of ['amount','value','valor','preco','unit_amount','unit_amount_cents','amount_total']) {
          if (k in v) {
            const nv = tryNumber(v[k]);
            if (nv != null) return Number.isInteger(nv) && nv > 1000 ? Number((nv/100).toFixed(2)) : nv;
          }
        }
        return null;
      }
      const n = tryNumber(v);
      if (n == null) return null;
      if (Number.isInteger(n) && n > 1000) {
        return Number((n / 100).toFixed(2));
      }
      return n;
    };

    for (const it of items) {
      const qty = Number(it.quantidade ?? it.quantity ?? it.qty ?? 1) || 1;

      // Determine unit price in BRL (float)
      let up: number | null = null;
      if (it.unit_amount != null) up = tryNumberMaybeCents(it.unit_amount);
      if (up == null && it.preco_unitario != null) up = tryNumberMaybeCents(it.preco_unitario);
      if (up == null) up = tryNumberMaybeCents(it.preco ?? it.unit_price ?? it.price ?? it.valor ?? it.amount_total ?? it.unit_amount_cents);

      // If still null, try to inspect object shapes (e.g., { preco_unitario: { amount: 4990 } })
      if (up == null) {
        for (const key of Object.keys(it || {})) {
          const val = it[key];
          if (typeof val === 'object') {
            const cand = tryNumberMaybeCents(val);
            if (cand != null) { up = cand; break; }
          }
        }
      }

      // If the backend included estoque with livro info, attach it as produto
      if (!it.__produto && it.estoque && it.estoque.livro) {
        it.__produto = it.estoque.livro;
      }

      // If unit price still null, try estoque.preco as fallback
      if (up == null && it.estoque && (it.estoque.preco != null)) {
        up = tryNumberMaybeCents(it.estoque.preco);
      }

      it.__quantity = qty;
      it.__unitPrice = up ?? null; // may be null
      it.__subtotal = (it.__unitPrice != null) ? Number((it.__unitPrice * qty).toFixed(2)) : null;
    }
    // after normalizing numeric values, try to fetch product details for items that reference a book/product
    this.fetchProductsForItems(items).catch(e => {
      console.warn('Erro ao buscar detalhes dos produtos para itens do pedido:', e);
    });
  }

  private async fetchProductsForItems(items: any[]) {
    if (!items || !Array.isArray(items)) return;

    const idToItems = new Map<string, any[]>();

    for (const it of items) {
      if (it.__produto) continue; // already attached

      // 1) try to find an embedded livro object anywhere in the item (recursively)
      const findObjectWithKeys = (obj: any, wantedKeys: string[], depth = 0): any | null => {
        if (!obj || typeof obj !== 'object' || depth > 6) return null;
        const keys = Object.keys(obj);
        const lower = keys.map(k => k.toLowerCase());
        // heuristics: object with 'titulo' or 'title' is likely a livro
        if (lower.includes('titulo') || lower.includes('title') || lower.includes('nome')) {
          return obj;
        }
        // also if object has id_livro or id and titulo together
        if ((lower.includes('id_livro') || lower.includes('id')) && (lower.includes('titulo') || lower.includes('title'))) {
          return obj;
        }
        for (const k of keys) {
          const val = obj[k];
          if (val && typeof val === 'object') {
            const r = findObjectWithKeys(val, wantedKeys, depth + 1);
            if (r) return r;
          }
        }
        return null;
      };

      const embeddedLivro = findObjectWithKeys(it, ['titulo','title','nome']);
      if (embeddedLivro) {
        it.__produto = embeddedLivro;
        continue;
      }

      // 2) otherwise try to find candidate id values recursively
      const findFirstId = (obj: any, depth = 0): any | null => {
        if (!obj || typeof obj !== 'object' || depth > 8) return null;
        for (const k of Object.keys(obj)) {
          const val = obj[k];
          const keyLower = k.toLowerCase();
          // direct common names
          if (['id_livro','livro_id','book_id','product_id','produto_id','id_estoque','id'].includes(keyLower)) {
            if (val != null) return val;
          }
          // pattern matches like livroId, idLivro, livroID, livro-id
          if (/livro.*id|id.*livro|book.*id|id.*book|produto.*id|id.*produto/i.test(k)) {
            if (val != null) return val;
          }
          // if key looks like an identifier (ends with id) and value is primitive
          if (/id$/i.test(k) && (typeof val === 'string' || typeof val === 'number')) {
            return val;
          }

          // special-case: preco_unitario may contain nested livro info or id
          if (keyLower === 'preco_unitario' && val && typeof val === 'object') {
            // look for livro inside preco_unitario
            const inside = findObjectWithKeys(val, ['titulo','title','nome']);
            if (inside) return inside.id || inside.id_livro || inside.livro_id || null;
            // or find a numeric id inside
            for (const kk of Object.keys(val)) {
              if (/livro.*id|id.*livro|book.*id/i.test(kk) && val[kk] != null) return val[kk];
            }
          }

          if (typeof val === 'object') {
            const r = findFirstId(val, depth + 1);
            if (r) return r;
          }
        }
        return null;
      };

      const rawId = findFirstId(it);
      if (!rawId) {
        console.debug('fetchProductsForItems: no product id candidates for item', { keys: Object.keys(it || {}), item: it });
        continue;
      }
      const id = String(rawId);
      if (!idToItems.has(id)) idToItems.set(id, []);
      idToItems.get(id)!.push(it);
    }

    if (idToItems.size === 0) {
      console.debug('fetchProductsForItems: no ids to fetch');
      return;
    }

    console.debug('fetchProductsForItems: will fetch product ids:', Array.from(idToItems.keys()));

    for (const [id, itemList] of idToItems.entries()) {
      try {
        const livro = await lastValueFrom(this.livroService.getLivroById(id));
        if (livro) {
          for (const it of itemList) {
            it.__produto = livro;
          }
          console.debug(`fetchProductsForItems: fetched and attached product id=${id}`);
        } else {
          console.debug(`fetchProductsForItems: livro not found for id=${id}`);
        }
      } catch (e) {
        console.warn(`fetchProductsForItems: failed to fetch livro id=${id}`, e);
      }
    }
  }

  private formatBRL(value: number): string {
    try {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } catch {
      return 'R$ ' + value.toFixed(2);
    }
  }

  // Safe wrapper used in templates: returns empty string when value is null/undefined
  formatBRLSafe(value: any): string {
    if (value == null || value === '') return '';
    try {
      const num = Number(value);
      if (isNaN(num)) return '';
      return this.formatBRL(num);
    } catch {
      return '';
    }
  }
}
