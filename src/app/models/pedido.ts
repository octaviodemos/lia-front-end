import { LivroImagem } from './livro-imagem';

export interface PedidoItemLivroResumo {
  id_livro?: number | string | null;
  titulo?: string | null;
  imagens?: LivroImagem[] | null;
  [k: string]: unknown;
}

export interface PedidoItem {
  livro?: PedidoItemLivroResumo | null;
  estoque?: { livro?: PedidoItemLivroResumo | null; [k: string]: unknown } | null;
  [k: string]: unknown;
}

export interface Pedido {
  id?: string | number;
  status?: string | null;
  itens?: PedidoItem[] | null;
  items?: PedidoItem[] | null;
  [k: string]: unknown;
}
