export interface LivroImagem {
  id?: number;
  url_imagem: string;
  tipo_imagem: string;
}

export type LivroImagemFormFieldName =
  | 'imagem_Capa'
  | 'imagem_Contracapa'
  | 'imagem_Lombada'
  | 'imagem_MioloPaginas'
  | 'imagem_DetalhesAvarias';

export const LIVRO_IMAGEM_FORM_SLOTS: ReadonlyArray<{
  formFieldName: LivroImagemFormFieldName;
  titulo: string;
  descricao: string;
}> = [
  { formFieldName: 'imagem_Capa', titulo: 'Capa', descricao: 'Frente do livro (capa).' },
  { formFieldName: 'imagem_Contracapa', titulo: 'Contracapa', descricao: 'Parte traseira.' },
  { formFieldName: 'imagem_Lombada', titulo: 'Lombada', descricao: 'Lateral com título e lombada.' },
  { formFieldName: 'imagem_MioloPaginas', titulo: 'Miolo / páginas', descricao: 'Páginas internas ou corte do miolo.' },
  { formFieldName: 'imagem_DetalhesAvarias', titulo: 'Detalhes e avarias', descricao: 'Marcas, rasgos, umidade ou desgaste.' }
];
