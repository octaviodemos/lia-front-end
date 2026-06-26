export type AdminViewMode = 'list' | 'kanban';

export type KanbanColumnDef = {
  value: string;
  label: string;
  badgeClass: string;
};

export function itensPorColunaKanban<T>(
  items: T[],
  statusValue: string,
  resolver: (item: T) => string,
): T[] {
  return items.filter((item) => resolver(item) === statusValue);
}

export function contarColunaKanban<T>(
  items: T[],
  statusValue: string,
  resolver: (item: T) => string,
): number {
  return itensPorColunaKanban(items, statusValue, resolver).length;
}

export function agruparItensKanban<T>(
  items: T[],
  columns: KanbanColumnDef[],
  resolver: (item: T) => string,
): Record<string, T[]> {
  const board: Record<string, T[]> = {};
  for (const coluna of columns) {
    board[coluna.value] = [];
  }
  for (const item of items) {
    const status = resolver(item);
    if (board[status]) {
      board[status].push(item);
    }
  }
  return board;
}

export type KanbanItemMovedEvent<T = unknown> = {
  item: T;
  fromStatus: string;
  toStatus: string;
};
