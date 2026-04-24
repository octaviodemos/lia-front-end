import { Livro, LivroRaw, Estoque } from '../models/livro';
import type { LivroImagem } from '../models/livro-imagem';

function parseNumberFromString(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseNotaConservacao(v: any): number | null {
  const n = parseNumberFromString(v);
  if (n === null) return null;
  const arredondada = Math.round(n);
  if (arredondada < 1 || arredondada > 5) return null;
  return arredondada;
}

function parseNotaMediaAvaliacoes(v: any): number | null {
  const n = parseNumberFromString(v);
  if (n === null) return null;
  const lim = Math.min(5, Math.max(0, n));
  return Math.round(lim * 10) / 10;
}

function parseTotalAvaliacoes(v: any): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseDestaqueVitrine(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function parseExemplaresMesmoIsbn(v: any): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.floor(n);
}

export function normalizePrecoToString(precoRaw: any): string | null {
  const n = parseNumberFromString(precoRaw);
  return n === null ? (precoRaw != null ? String(precoRaw) : null) : n.toFixed(2);
}

function coerceDisponivel(v: unknown): boolean {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  if (v === false || v === 'false' || v === 0 || v === '0') return false;
  return true;
}

function mapLinhaEstoque(rawLivroId: number, row: any): Estoque {
  return {
    id_estoque: row?.id_estoque != null ? Number(row.id_estoque) : null,
    id_livro: row?.id_livro != null ? Number(row.id_livro) : Number(rawLivroId),
    disponivel: coerceDisponivel(row?.disponivel),
    preco: normalizePrecoToString(row?.preco ?? null),
    condicao: row?.condicao ?? null
  };
}

export function extractEstoquesFromRaw(raw: LivroRaw): Estoque[] {
  if (!raw) return [];

  if (raw.id_estoque != null || raw.preco != null) {
    return [
      {
        id_estoque: raw.id_estoque != null ? Number(raw.id_estoque) : null,
        id_livro: raw.id_livro,
        disponivel: true,
        preco: normalizePrecoToString(raw.preco ?? null),
        condicao: null
      }
    ];
  }

  const e = raw.estoque;
  if (!e) return [];

  if (Array.isArray(e)) {
    if (e.length === 0) return [];
    return e.map((row: any) => mapLinhaEstoque(raw.id_livro, row));
  }

  return [mapLinhaEstoque(raw.id_livro, e)];
}

export function pickPrimaryEstoque(estoques: Estoque[]): Estoque | null {
  if (!estoques.length) return null;
  const livre = estoques.find((x) => x.disponivel);
  return livre ?? estoques[0];
}

export function extractPrimaryEstoque(raw: LivroRaw): Estoque | null {
  return pickPrimaryEstoque(extractEstoquesFromRaw(raw));
}

export function normalizeLivro(raw: LivroRaw): Livro {
  const estoquesList = extractEstoquesFromRaw(raw);
  const estoque = pickPrimaryEstoque(estoquesList);

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

  let imagens: LivroImagem[] | null = null;
  if (Array.isArray(raw.imagens) && raw.imagens.length > 0) {
    imagens = raw.imagens.map((item: any) => ({
      id: item?.id ?? item?.id_imagem ?? undefined,
      url_imagem: String(item?.url_imagem ?? item?.url ?? ''),
      tipo_imagem: String(item?.tipo_imagem ?? item?.tipo ?? '')
    })).filter((img) => img.url_imagem.length > 0);
    if (imagens.length === 0) {
      imagens = null;
    }
  }

  const descricaoConservacao = raw.descricao_conservacao != null
    ? String(raw.descricao_conservacao).trim() || null
    : null;

  let outrasOpcoes: Livro[] | null = null;
  const filhas = raw.outras_opcoes;
  if (Array.isArray(filhas) && filhas.length) {
    outrasOpcoes = filhas
      .filter((item: any) => item != null && item.id_livro != null)
      .map((item: any) => {
        const copia = { ...item };
        delete copia.outras_opcoes;
        return normalizeLivro(copia as LivroRaw);
      });
  }

  const outrosCount = outrasOpcoes?.length ?? 0;
  const exCatalogo = parseExemplaresMesmoIsbn(raw.exemplares_mesmo_isbn);
  const exemplares_mesmo_isbn =
    exCatalogo != null ? exCatalogo : outrosCount > 0 ? outrosCount + 1 : undefined;

  return {
    id_livro: raw.id_livro,
    titulo: raw.titulo,
    sinopse: raw.sinopse ?? null,
    editora: raw.editora ?? null,
    ano_publicacao: raw.ano_publicacao ?? null,
    isbn: raw.isbn ?? null,
    nota_conservacao: parseNotaConservacao(raw.nota_conservacao),
    descricao_conservacao: descricaoConservacao,
    nota_media_avaliacoes: parseNotaMediaAvaliacoes(raw.nota_media_avaliacoes),
    total_avaliacoes: parseTotalAvaliacoes(raw.total_avaliacoes),
    destaque_vitrine: parseDestaqueVitrine(raw.destaque_vitrine),
    exemplares_mesmo_isbn,
    imagens,
    estoque,
    estoques: estoquesList.length ? estoquesList : null,
    generos: generosArray ?? [],
    autores: autoresArray ?? [],
    outras_opcoes: outrasOpcoes && outrasOpcoes.length ? outrasOpcoes : null
  } as Livro;
}
