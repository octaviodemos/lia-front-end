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
  const url = livro.capa_url;
  if (!url || url.includes('placeholder') || url.includes('200x300') || url.includes('text=')) {
    return 'assets/placeholder.svg';
  }
  if (!url.startsWith('http')) return url;
  return url;
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

export function temPreco(livro: any): boolean {
  if (!livro || !livro.estoque) return false;
  const preco = livro.estoque.preco;
  if (preco == null && preco !== 0) return false;
  const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
  return !isNaN(precoNum) && isFinite(precoNum) && precoNum > 0;
}
