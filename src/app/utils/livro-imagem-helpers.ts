import type { LivroImagem, LivroImagemFormFieldName } from '../models/livro-imagem';

const PLACEHOLDER = 'assets/placeholder.svg';

function normalizarTipo(tipo: string | null | undefined): string {
  return (tipo ?? '').trim().toLowerCase();
}

export function urlImagemPrincipalDoLivro(livro: { imagens?: LivroImagem[] | null } | null | undefined): string {
  if (!livro?.imagens?.length) {
    return PLACEHOLDER;
  }
  const lista = livro.imagens;
  const capa = lista.find((img) => normalizarTipo(img?.tipo_imagem) === 'capa');
  const candidato = capa?.url_imagem || lista[0]?.url_imagem;
  const url = candidato?.trim();
  if (!url || url.includes('placeholder') || url.includes('200x300') || url.includes('text=')) {
    return PLACEHOLDER;
  }
  if (!url.startsWith('http')) {
    return url;
  }
  return url;
}

export function mensagemErroArquivoImagem(arquivo: File, tamanhoMaxBytes: number): string | null {
  if (arquivo.size > tamanhoMaxBytes) {
    return 'Arquivo muito grande. Tamanho máximo: 5MB';
  }
  if (!arquivo.type.startsWith('image/')) {
    return 'Por favor, selecione uma imagem válida';
  }
  return null;
}

const ROTULOS_TIPO_IMAGEM: Record<string, string> = {
  Capa: 'Capa',
  Contracapa: 'Contracapa',
  Lombada: 'Lombada',
  MioloPaginas: 'Miolo/Páginas',
  DetalhesAvarias: 'Detalhes/Avarias'
};

export function rotuloTipoImagemLegivel(tipo: string | null | undefined): string {
  const t = (tipo ?? '').trim();
  if (!t) {
    return 'Imagem';
  }
  const chave = Object.keys(ROTULOS_TIPO_IMAGEM).find((k) => k.toLowerCase() === t.toLowerCase());
  if (chave) {
    return ROTULOS_TIPO_IMAGEM[chave];
  }
  return t.replace(/([a-z])([A-Z])/g, '$1/$2');
}

export function anexarImagensLivroNoFormData(
  formData: FormData,
  arquivosPorCampo: Partial<Record<LivroImagemFormFieldName, File | null | undefined>>
): void {
  (Object.keys(arquivosPorCampo) as LivroImagemFormFieldName[]).forEach((chave) => {
    const arquivo = arquivosPorCampo[chave];
    if (arquivo) {
      formData.append(chave, arquivo, arquivo.name);
    }
  });
}
