export function normalizeStatusLabel(pedido: any): string {
  return (pedido?.status_pedido_label || pedido?.status_pedido || pedido?.status || '').toString().toLowerCase();
}

export function badgeClass(pedido: any): string {
  const label = normalizeStatusLabel(pedido);
  switch (label) {
    case 'aprovado':
    case 'paid':
    case 'approved':
    case 'succeeded':
      return 'badge--success';
    case 'pendente':
    case 'pending':
    case 'processing':
      return 'badge--warning';
    case 'rejeitado':
    case 'failed':
    case 'rejected':
    case 'rejected_by_network':
      return 'badge--danger';
    case 'canceled':
    case 'cancelled':
    case 'cancelado':
      return 'badge--muted';
    case 'refunded':
    case 'chargeback':
    case 'estornado':
      return 'badge--info';
    default:
      return 'badge--neutral';
  }
}

export function isApproved(pedido: any): boolean {
  const label = normalizeStatusLabel(pedido);
  return ['aprovado', 'paid', 'approved', 'succeeded', 'pago'].includes(label);
}

export function getFriendlyLabel(pedido: any): string {
  if (pedido && pedido.status_pedido_label) return String(pedido.status_pedido_label);

  const label = normalizeStatusLabel(pedido);
  switch (label) {
    case 'aprovado':
    case 'paid':
    case 'approved':
    case 'succeeded':
      return 'aprovado';
    case 'pendente':
    case 'pending':
    case 'processing':
      return 'pendente';
    case 'rejeitado':
    case 'failed':
    case 'rejected':
    case 'rejected_by_network':
      return 'rejeitado';
    case 'canceled':
    case 'cancelled':
    case 'cancelado':
      return 'cancelado';
    case 'refunded':
    case 'chargeback':
    case 'estornado':
      return 'estornado';
    default:
      // If there's a more descriptive technical status, return it as-is
      return (pedido?.status_pedido || pedido?.status || '').toString();
  }
}
