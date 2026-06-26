export function normalizeOrderStatusCode(status?: string): string {
  if (!status) return '';
  const v = String(status).trim().toLowerCase();

  const aliases: Record<string, string> = {
    pendente: 'pending',
    pagamento_pendente: 'pending',
    pagamento_aprovado: 'paid',
    pago: 'paid',
    aprovado: 'paid',
    approved: 'paid',
    succeeded: 'paid',
    'em processamento': 'processing',
    enviado: 'shipped',
    entregue: 'delivered',
    cancelado: 'cancelled',
    canceled: 'cancelled',
    rejeitado: 'rejected',
    failed: 'rejected',
    rejected_by_network: 'rejected',
    estornado: 'refunded',
    chargeback: 'refunded',
    refunded: 'refunded',
  };

  return aliases[v] || v;
}

export function normalizeStatusLabel(pedido: any): string {
  const raw = pedido?.status_pedido || pedido?.status || '';
  return normalizeOrderStatusCode(raw);
}

export function mapOrderStatusLabel(status?: string): string {
  const code = normalizeOrderStatusCode(status);
  switch (code) {
    case 'pending':
      return 'Pendente';
    case 'processing':
      return 'Em processamento';
    case 'paid':
      return 'Pago';
    case 'shipped':
      return 'Enviado';
    case 'delivered':
      return 'Entregue';
    case 'cancelled':
      return 'Cancelado';
    case 'rejected':
      return 'Rejeitado';
    case 'refunded':
      return 'Estornado';
    default:
      return code ? code.charAt(0).toUpperCase() + code.slice(1) : 'Desconhecido';
  }
}

export function badgeClass(pedido: any): string {
  const code = normalizeStatusLabel(pedido);
  switch (code) {
    case 'paid':
    case 'delivered':
      return 'badge--success';
    case 'pending':
    case 'processing':
      return 'badge--warning';
    case 'rejected':
      return 'badge--danger';
    case 'cancelled':
      return 'badge--muted';
    case 'refunded':
      return 'badge--info';
    case 'shipped':
      return 'badge--info';
    default:
      return 'badge--neutral';
  }
}

export function isApproved(pedido: any): boolean {
  const code = normalizeStatusLabel(pedido);
  return code === 'paid' || code === 'delivered';
}

export function getFriendlyLabel(pedido: any): string {
  if (pedido?.status_pedido_label) {
    return String(pedido.status_pedido_label);
  }
  return mapOrderStatusLabel(pedido?.status_pedido || pedido?.status);
}

export const ORDER_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'processing', label: 'Em processamento' },
  { value: 'paid', label: 'Pago' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'refunded', label: 'Estornado' },
];
