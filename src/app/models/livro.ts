export interface Estoque {
  id_estoque: number | null;
  id_livro?: number | null;
  quantidade?: number | null;
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
  capa_url?: string | null;
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
  capa_url?: string | null;
  estoque?: Estoque | null;
  generos?: Genero[] | null;
  autores?: Autor[] | null;
}
