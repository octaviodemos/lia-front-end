import { urlImagemPrincipalDoLivro } from './livro-imagem-helpers';

export function getGeneroLabel(livro: any): string {
  if (!livro) return 'Não informado';
  if (livro.generos && Array.isArray(livro.generos) && livro.generos.length > 0) {
    const names = livro.generos.map((g: any) => g?.nome || g?.nome_genero || g?.nome || '').filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  if (livro.genero && typeof livro.genero === 'object') {
    return livro.genero.nome || livro.genero.nome_genero || 'Não informado';
  }
  if (livro.genero && typeof livro.genero === 'string') return livro.genero;
  return 'Não informado';
}

export function getImagemUrl(livro: any): string {
  if (!livro) return 'assets/placeholder.svg';
  return urlImagemPrincipalDoLivro(livro);
}

export function getAutorNome(livro: any): string {
  if (!livro) return 'Autor desconhecido';
  if (livro.autores && Array.isArray(livro.autores) && livro.autores.length > 0) {
    return livro.autores[0].nome || 'Autor desconhecido';
  }
  if (livro.autor && typeof livro.autor === 'object') return livro.autor.nome || 'Autor desconhecido';
  if (livro.autor && typeof livro.autor === 'string') return livro.autor;
  return 'Autor desconhecido';
}

function linhaCompraValida(e: any): boolean {
  if (!e || e.disponivel === false) return false;
  const preco = e.preco;
  if (preco == null || preco === '') return false;
  const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
  return !isNaN(precoNum) && isFinite(precoNum) && precoNum > 0;
}

export function temPreco(livro: any): boolean {
  if (!livro) return false;
  if (Array.isArray(livro.estoques) && livro.estoques.length > 0) {
    return livro.estoques.some((e: any) => linhaCompraValida(e));
  }
  if (livro.estoque) return linhaCompraValida(livro.estoque);
  return false;
}
