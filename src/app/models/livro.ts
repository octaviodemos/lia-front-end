export interface Estoque {
  id_estoque: number | null;
  id_livro?: number | null;
  quantidade?: number | null;
  preco?: string | null;
  condicao?: string | null;
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
}
