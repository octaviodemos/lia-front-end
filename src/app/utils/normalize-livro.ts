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

  return {
    id_livro: raw.id_livro,
    titulo: raw.titulo,
    sinopse: raw.sinopse ?? null,
    editora: raw.editora ?? null,
    ano_publicacao: raw.ano_publicacao ?? null,
    isbn: raw.isbn ?? null,
    capa_url: raw.capa_url ?? null,
    estoque
  } as Livro;
}
