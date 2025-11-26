import { Livro, LivroRaw, Estoque } from '../models/livro';

function parseNumberFromString(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function normalizePrecoToString(precoRaw: any): string | null {
  const n = parseNumberFromString(precoRaw);
  return n === null ? (precoRaw != null ? String(precoRaw) : null) : n.toFixed(2);
}

export function extractPrimaryEstoque(raw: LivroRaw): Estoque | null {
  if (!raw) return null;

  if (raw.preco != null || raw.id_estoque != null) {
    return {
      id_estoque: raw.id_estoque ?? null,
      preco: normalizePrecoToString(raw.preco ?? null)
    } as Estoque;
  }

  const e = raw.estoque;
  if (!e) return null;
  if (Array.isArray(e)) {
    if (e.length === 0) return null;
    const first = e[0];
    return {
      id_estoque: first.id_estoque ?? null,
      id_livro: first.id_livro ?? null,
      quantidade: first.quantidade ?? null,
      preco: normalizePrecoToString(first.preco ?? null),
      condicao: first.condicao ?? null
    } as Estoque;
  }

  return {
    id_estoque: e.id_estoque ?? null,
    id_livro: e.id_livro ?? null,
    quantidade: e.quantidade ?? null,
    preco: normalizePrecoToString(e.preco ?? null),
    condicao: e.condicao ?? null
  } as Estoque;
}

export function normalizeLivro(raw: LivroRaw): Livro {
  const estoque = extractPrimaryEstoque(raw);

  let generosArray: any[] | null = null;
    let autoresArray: any[] | null = null;

  if (raw && raw.generos != null) {
    if (Array.isArray(raw.generos)) {
      generosArray = raw.generos.map(g => {
        const candidate = g && g.genero ? g.genero : g;
        return {
          id_genero: candidate?.id_genero ?? candidate?.id ?? null,
          nome: candidate?.nome ?? null
        };
      }).filter(Boolean);
    }
  }

  if ((!generosArray || generosArray.length === 0) && raw && raw.genero != null) {
    if (typeof raw.genero === 'object') {
      generosArray = [{
        id_genero: raw.genero.id_genero ?? raw.genero.id ?? null,
        nome: raw.genero.nome ?? raw.genero.nome_genero ?? null
      }];
    } else {
      generosArray = [{ nome: String(raw.genero) }];
    }
  }

    if (raw && raw.autores != null) {
      if (Array.isArray(raw.autores)) {
        autoresArray = raw.autores.map(a => {
          const candidate = a && a.autor ? a.autor : a;
          return {
            id_autor: candidate?.id_autor ?? candidate?.id ?? null,
            nome: candidate?.nome_completo ?? candidate?.nome ?? null
          };
        }).filter(Boolean);
      }
    }
    
    if ((!autoresArray || autoresArray.length === 0) && raw && raw['autor'] != null) {
      if (typeof raw['autor'] === 'object') {
        autoresArray = [{
          id_autor: raw['autor'].id_autor ?? raw['autor'].id ?? null,
          nome: raw['autor'].nome_completo ?? raw['autor'].nome ?? null
        }];
      } else {
        autoresArray = [{ nome: String(raw['autor']) }];
      }
    }

  return {
    id_livro: raw.id_livro,
    titulo: raw.titulo,
    sinopse: raw.sinopse ?? null,
    editora: raw.editora ?? null,
    ano_publicacao: raw.ano_publicacao ?? null,
    isbn: raw.isbn ?? null,
    capa_url: raw.capa_url ?? null,
    estoque,
    generos: generosArray ?? [],
    autores: autoresArray ?? []
  } as Livro;
}
