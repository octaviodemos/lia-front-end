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

export const OFFER_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aceita', label: 'Aceita' },
  { value: 'recusada', label: 'Recusada' },
];

export function normalizeOfferStatusCode(status?: string): string {
  if (!status) return '';
  const value = String(status).trim().toLowerCase();
  if (value === 'aceito' || value === 'aprovado' || value === 'approved') return 'aceita';
  if (value === 'recusado' || value === 'rejeitado' || value === 'rejected') return 'recusada';
  return value;
}

export function mapOfferStatusLabel(status?: string): string {
  const code = normalizeOfferStatusCode(status);
  switch (code) {
    case 'pendente':
      return 'Pendente';
    case 'aceita':
      return 'Aceita';
    case 'recusada':
      return 'Recusada';
    default:
      return code ? code.charAt(0).toUpperCase() + code.slice(1) : 'Desconhecido';
  }
}

export function offerBadgeClass(oferta: any): string {
  const code = normalizeOfferStatusCode(oferta?.status_oferta || oferta?.status);
  switch (code) {
    case 'aceita':
      return 'badge--success';
    case 'recusada':
      return 'badge--danger';
    case 'pendente':
      return 'badge--warning';
    default:
      return 'badge--neutral';
  }
}

export function getOfferFriendlyLabel(oferta: any): string {
  return mapOfferStatusLabel(oferta?.status_oferta || oferta?.status);
}

export const REPAIR_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'REJECTED', label: 'Rejeitado' },
];

export function normalizeRepairStatusCode(status?: string): string {
  if (!status) return '';
  const value = String(status).trim().toLowerCase();

  const aliases: Record<string, string> = {
    pendente: 'pending',
    em_andamento: 'in_progress',
    'em andamento': 'in_progress',
    concluido: 'completed',
    concluído: 'completed',
    rejeitado: 'rejected',
    recusado: 'rejected',
  };

  const normalized = aliases[value] || value.replace(/\s+/g, '_');
  switch (normalized) {
    case 'pending':
      return 'PENDING';
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'completed':
      return 'COMPLETED';
    case 'rejected':
      return 'REJECTED';
    default:
      return String(status).trim().toUpperCase();
  }
}

export function mapRepairStatusLabel(status?: string): string {
  const code = normalizeRepairStatusCode(status);
  switch (code) {
    case 'PENDING':
      return 'Pendente';
    case 'IN_PROGRESS':
      return 'Em andamento';
    case 'COMPLETED':
      return 'Concluído';
    case 'REJECTED':
      return 'Rejeitado';
    default:
      return status ? String(status) : 'Desconhecido';
  }
}

export function repairBadgeClass(solicitacao: any): string {
  const code = normalizeRepairStatusCode(solicitacao?.status_solicitacao || solicitacao?.status);
  switch (code) {
    case 'COMPLETED':
      return 'badge--success';
    case 'PENDING':
      return 'badge--warning';
    case 'IN_PROGRESS':
      return 'badge--info';
    case 'REJECTED':
      return 'badge--danger';
    default:
      return 'badge--neutral';
  }
}

export function getRepairFriendlyLabel(solicitacao: any): string {
  return mapRepairStatusLabel(solicitacao?.status_solicitacao || solicitacao?.status);
}
