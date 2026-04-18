import { LivroImagem } from './livro-imagem';

export interface OfertaVenda {
  id?: string | number;
  titulo_livro?: string | null;
  autor_livro?: string | null;
  isbn?: string | null;
  condicao_livro?: string | null;
  preco_sugerido?: string | number | null;
  status?: string | null;
  resposta_admin?: string | null;
  imagens?: LivroImagem[] | null;
  [k: string]: unknown;
}
