export interface IdentificacaoCapa {
  titulo: string;
  autor: string;
  isbn: string | null;
  editora: string;
  ano_publicacao: number | null;
  sinopse: string | null;
  confianca: 'alta' | 'media' | 'baixa';
}
