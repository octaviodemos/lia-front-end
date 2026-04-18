import type { LivroImagem } from './livro-imagem';

export type { LivroImagem } from './livro-imagem';

export interface Estoque {
  id_estoque: number | null;
  id_livro?: number | null;
  disponivel: boolean;
  preco?: string | null;
  condicao?: string | null;
}

export interface Genero {
  id_genero?: number | null;
  nome?: string | null;
}
export interface Autor {
  id_autor?: number | null;
  nome?: string | null;
}
export interface LivroRaw {
  id_livro: number;
  titulo: string;
  sinopse?: string | null;
  editora?: string | null;
  ano_publicacao?: number | null;
  isbn?: string | null;
  nota_conservacao?: number | string | null;
  descricao_conservacao?: string | null;
  nota_media_avaliacoes?: number | string | null;
  total_avaliacoes?: number | string | null;
  imagens?: LivroImagem[] | null;
  estoque?: any; 
  preco?: any; 
  id_estoque?: any; 
  genero?: any;
  generos?: any;
  autores?: any;
  [k: string]: any;
}

export interface Livro {
  id_livro: number;
  titulo: string;
  sinopse?: string | null;
  editora?: string | null;
  ano_publicacao?: number | null;
  isbn?: string | null;
  nota_conservacao?: number | null;
  descricao_conservacao?: string | null;
  nota_media_avaliacoes?: number | null;
  total_avaliacoes?: number;
  imagens?: LivroImagem[] | null;
  estoque?: Estoque | null;
  estoques?: Estoque[] | null;
  generos?: Genero[] | null;
  autores?: Autor[] | null;
}
