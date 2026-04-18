import { LivroImagem } from './livro-imagem';

export interface SolicitacaoReforma {
  id?: string | number;
  descricao_problema?: string | null;
  status?: string | null;
  status_solicitacao?: string | null;
  resposta_admin?: string | null;
  imagens?: LivroImagem[] | null;
  [k: string]: unknown;
}
