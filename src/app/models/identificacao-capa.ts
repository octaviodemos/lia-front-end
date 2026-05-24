export interface IdentificacaoCapa {
  titulo: string;
  autor: string;
  isbn: string | null;
  confianca: 'alta' | 'media' | 'baixa';
}
