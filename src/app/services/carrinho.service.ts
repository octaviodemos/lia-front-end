import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from './auth';
import type { LivroImagem } from '../models/livro-imagem';
import { urlImagemPrincipalDoLivro } from '../utils/livro-imagem-helpers';

export interface ItemCarrinho {
  livroId: string;
  cartItemId?: number;
  titulo: string;
  autor: string;
  preco: number;
  imagemUrl?: string;
  imagens?: LivroImagem[];
  estoqueId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CarrinhoService {
  
  private carrinho$ = new BehaviorSubject<ItemCarrinho[]>([]);
  private readonly STORAGE_KEY = 'lia_carrinho';
  private readonly REMOVED_ITEMS_KEY = 'lia_carrinho_removed';
  private apiUrl = 'http://localhost:3333/api';
  
  private estoqueCache = new Map<number, { podeComprar: boolean; timestamp: number }>();
  private autorCache = new Map<number, { autor: string; timestamp: number }>();
  private readonly CACHE_DURATION = 30000;

  constructor(private http: HttpClient, private authService: AuthService) {
    this.carregarCarrinhoDoStorage();
  }

  getCarrinho(): Observable<ItemCarrinho[]> {
    return this.carrinho$.asObservable();
  }

  refreshCarrinho(): Observable<ItemCarrinho[]> {
    const token = this.authService.getToken();
    if (!token) {
      return of(this.getCarrinhoAtual());
    }

    return this.http.get(`${this.apiUrl}/cart`).pipe(
      map(res => this.mapCartResponse(res)),
      tap((backendItems: ItemCarrinho[]) => {
        const currentItems = this.getCarrinhoAtual();
        
        const itensRemovidosLocal = this.getItensRemovidosLocal();
        if (itensRemovidosLocal.length > 0) {
          backendItems = backendItems.filter(item => {
            const foiRemovido = itensRemovidosLocal.some(removido => 
              removido.livroId === item.livroId || removido.cartItemId === item.cartItemId
            );
            return !foiRemovido;
          });
        }
        
        if (backendItems.length === 0 && currentItems.length > 0) {
          return;
        }
        
        this.carrinho$.next(backendItems);
      }),
      map(() => this.getCarrinhoAtual()),
      catchError(() => {
        return of(this.getCarrinhoAtual());
      })
    );
  }

  getCarrinhoAtual(): ItemCarrinho[] {
    return this.carrinho$.value;
  }

  adicionarItemLocal(item: ItemCarrinho): void {
    const carrinhoAtual = this.getCarrinhoAtual();
    const idAlvo = item.estoqueId;
    if (idAlvo != null && carrinhoAtual.some((i) => i.estoqueId === idAlvo)) {
      return;
    }
    carrinhoAtual.push(item);
    this.atualizarCarrinho([...carrinhoAtual]);
  }

  verificarEstoque(id_estoque: number): Observable<{ podeComprar: boolean }> {
    const agora = Date.now();
    const dadosCache = this.estoqueCache.get(id_estoque);
    
    if (dadosCache && (agora - dadosCache.timestamp) < this.CACHE_DURATION) {
      return of({ podeComprar: dadosCache.podeComprar });
    }
    return this.http.get(`${this.apiUrl}/stock/${id_estoque}`).pipe(
      map((estoque: any) => {
        const podeComprar =
          estoque?.disponivel === true ||
          estoque?.disponivel === 'true' ||
          estoque?.disponivel === 1 ||
          estoque?.disponivel === '1';
        
        this.estoqueCache.set(id_estoque, {
          podeComprar,
          timestamp: agora
        });
        
        return { podeComprar };
      }),
      catchError(() => {
        return of({ podeComprar: false });
      })
    );
  }

  adicionarItem(id_estoque: number, meta?: Partial<ItemCarrinho>): Observable<ItemCarrinho[]> {
    return this.verificarEstoque(id_estoque).pipe(
      switchMap((estoque) => {
        if (!estoque.podeComprar) {
          const erro = {
            status: 400,
            error: {
              message: 'Este exemplar não está disponível para compra.',
              type: 'ESTOQUE_INDISPONIVEL'
            }
          };
          return throwError(() => erro);
        }

        return this.http.post(`${this.apiUrl}/cart/items`, { id_estoque }).pipe(
          switchMap(() => this.http.get(`${this.apiUrl}/cart`)),
          map(res => this.mapCartResponse(res)),
          tap(items => this.carrinho$.next(items)),
          catchError((err) => {
            if (err && err.status === 401) {
              const localItem = this.buildLocalItemFromMeta(id_estoque, meta);
              this.adicionarItemLocal(localItem);
              return of(this.getCarrinhoAtual());
            }
            return throwError(() => err);
          })
        );
      })
    );
  }

  private buildLocalItemFromMeta(id_estoque: number, meta?: Partial<ItemCarrinho>): ItemCarrinho {
    const preco = typeof meta?.preco === 'number' ? meta!.preco : (meta?.preco ? Number(String(meta.preco).replace(',', '.')) || 0 : 0);
    return {
      livroId: meta?.livroId ?? String(id_estoque),
      titulo: meta?.titulo ?? 'Produto',
      autor: meta?.autor ?? '',
      preco,
      imagemUrl: meta?.imagemUrl ?? '',
      estoqueId: id_estoque
    } as ItemCarrinho;
  }

  private mapCartResponse(res: any): ItemCarrinho[] {
    
    if (!res) return [];
    
    let items: any[] = [];
    
    if (Array.isArray(res)) {
      items = res;
    } else if (res.itens && Array.isArray(res.itens)) {
      items = res.itens;
    } else if (res.items && Array.isArray(res.items)) {
      items = res.items;
    } else if (res.data && Array.isArray(res.data)) {
      items = res.data;
    }
    
    const itensMapeados = items.map((item: any) => {
      const estoque = item.estoque || {};
      const livro = estoque.livro || {};
      
      const mapped = {
        livroId: String(
          livro.id_livro || 
          estoque.id_livro || 
          item.id_estoque || 
          'unknown'
        ),
        cartItemId: 
          item.id_carrinho_item || 
          item.id || 
          item.id_cart_item ||
          item.cartItemId ||
          item.item_id ||
          undefined,
        titulo: 
          livro.titulo || 
          livro.title || 
          item.titulo || 
          'Livro sem título',
        autor: this.extrairAutorDosdados(livro, item) || 'Autor desconhecido',
        estoqueId: item.id_estoque != null ? Number(item.id_estoque) : (estoque.id_estoque != null ? Number(estoque.id_estoque) : undefined),
        preco: this.parsePrice(
          item.preco_unitario || 
          item.preco_original || 
          item.preco || 
          livro.preco_original ||
          livro.preco_unitario ||
          livro.preco || 
          livro.valor ||
          livro.price ||
          (estoque.preco && estoque.preco !== '0.00' ? estoque.preco : null) ||
          estoque.valor ||
          estoque.price ||
          item.valor ||
          item.price ||
          this.getFallbackPrice(livro.id_livro) ||
          0
        ),
        imagens: Array.isArray(livro.imagens) ? livro.imagens : undefined,
        imagemUrl:
          livro.image ||
          livro.imagemUrl ||
          item.imagemUrl ||
          urlImagemPrincipalDoLivro(livro)
      };
      
      return mapped;
    });

    return itensMapeados;
  }

  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const cleanPrice = price.replace(/[^\d,.-]/g, '').replace(',', '.');
      const parsed = parseFloat(cleanPrice);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getFallbackPrice(idLivro: number): number {
    const precosFallback: { [key: number]: number } = {
      1: 49.90,
      2: 39.90,
      3: 44.90,
      4: 29.90,
      5: 34.90,
      6: 24.90,
      7: 32.50,
      8: 37.00,
      9: 28.00,
      10: 19.90,
      11: 20.00
    };
    
    return precosFallback[idLivro] || 0;
  }

  removerItem(ref: ItemCarrinho | string): void {
    const carrinhoAtual = this.getCarrinhoAtual();
    let itemRemovido: ItemCarrinho | undefined;

    if (typeof ref === 'string') {
      itemRemovido = carrinhoAtual.find(i => i.livroId === ref);
    } else {
      itemRemovido = carrinhoAtual.find(i => {
        if (ref.cartItemId != null && i.cartItemId != null) {
          return i.cartItemId === ref.cartItemId;
        }
        if (ref.estoqueId != null && i.estoqueId != null) {
          return i.estoqueId === ref.estoqueId;
        }
        return i.livroId === ref.livroId;
      });
    }

    if (!itemRemovido) {
      return;
    }
    
    const carrinhoNovo = carrinhoAtual.filter(i => i !== itemRemovido);
    this.atualizarCarrinho(carrinhoNovo);
    
    const token = this.authService.getToken();
    if (token && itemRemovido.cartItemId) {
      this.sincronizarCarrinhoComBackend(carrinhoNovo);
    }
  }

  limparCarrinho(): void {
    this.atualizarCarrinho([]);
    
    const token = this.authService.getToken();
    if (token) {
      this.http.delete(`${this.apiUrl}/cart`).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  getTotalItens(): number {
    return this.getCarrinhoAtual().length;
  }

  getValorTotal(): number {
    return this.getCarrinhoAtual().reduce(
      (total, item) => total + item.preco,
      0
    );
  }

  private atualizarCarrinho(carrinho: ItemCarrinho[]): void {
    this.carrinho$.next(carrinho);
    this.salvarCarrinhoNoStorage(carrinho);
  }

  private salvarCarrinhoNoStorage(carrinho: ItemCarrinho[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(carrinho));
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error);
    }
  }

  private getCarrinhoDoStorage(): ItemCarrinho[] {
    try {
      const carrinhoSalvo = localStorage.getItem(this.STORAGE_KEY);
      
      if (carrinhoSalvo) {
        const carrinho = JSON.parse(carrinhoSalvo) as ItemCarrinho[];
        return Array.isArray(carrinho) ? carrinho : [];
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao ler carrinho do localStorage:', error);
      return [];
    }
  }

  private carregarCarrinhoDoStorage(): void {
    const carrinho = this.getCarrinhoDoStorage();
    this.carrinho$.next(carrinho);
  }

  private adicionarItemRemovidoLocal(item: ItemCarrinho): void {
    try {
      const itensRemovidos = this.getItensRemovidosLocal();
      const itemRemovido = {
        livroId: item.livroId,
        cartItemId: item.cartItemId,
        titulo: item.titulo,
        removidoEm: new Date().toISOString()
      };
      
      const jaExiste = itensRemovidos.some(removido => 
        removido.livroId === item.livroId || 
        (removido.cartItemId && item.cartItemId && removido.cartItemId === item.cartItemId)
      );
      
      if (!jaExiste) {
        itensRemovidos.push(itemRemovido);
        localStorage.setItem(this.REMOVED_ITEMS_KEY, JSON.stringify(itensRemovidos));
      }
    } catch (error) {
      console.error('Erro ao salvar item removido:', error);
    }
  }

  private getItensRemovidosLocal(): any[] {
    try {
      const itensRemovidos = localStorage.getItem(this.REMOVED_ITEMS_KEY);
      if (itensRemovidos) {
        const lista = JSON.parse(itensRemovidos);
        const agora = new Date().getTime();
        const lista24h = lista.filter((item: any) => {
          const removidoEm = new Date(item.removidoEm).getTime();
          return (agora - removidoEm) < 24 * 60 * 60 * 1000;
        });
        
        if (lista24h.length !== lista.length) {
          localStorage.setItem(this.REMOVED_ITEMS_KEY, JSON.stringify(lista24h));
        }
        
        return lista24h;
      }
      return [];
    } catch (error) {
      console.error('Erro ao ler itens removidos:', error);
      return [];
    }
  }

  atualizarInfoEstoque(): Observable<ItemCarrinho[]> {
    return of(this.getCarrinhoAtual());
  }

  private sincronizarCarrinhoComBackend(itensLocais: ItemCarrinho[]): void {
    this.http.delete(`${this.apiUrl}/cart`).subscribe({
      next: () => {
        if (itensLocais.length > 0) {
          this.recriarItensNoBackend(itensLocais);
        }
      },
      error: () => {}
    });
  }

  private recriarItensNoBackend(itens: ItemCarrinho[]): void {
    itens.forEach((item) => {
      const id_estoque = item.estoqueId ?? parseInt(item.livroId, 10);
      if (!id_estoque || Number.isNaN(id_estoque)) {
        return;
      }
      this.http.post(`${this.apiUrl}/cart/items`, { id_estoque }).subscribe({
        next: () => {},
        error: () => {}
      });
    });
  }

  limparCacheEstoque(): void {
    this.estoqueCache.clear();
  }

  forcarAtualizacaoEstoque(): Observable<ItemCarrinho[]> {
    this.limparCacheEstoque();
    return this.atualizarInfoEstoque();
  }

  buscarAutor(idLivro: number): Observable<string> {
    const agora = Date.now();
    const dadosCache = this.autorCache.get(idLivro);
    
    if (dadosCache && (agora - dadosCache.timestamp) < this.CACHE_DURATION) {
      return of(dadosCache.autor);
    }
    
    return this.http.get(`${this.apiUrl}/livros/${idLivro}/autor`).pipe(
      map((response: any) => {
        const autor = response.autor || 
                     response.nome || 
                     response.name ||
                     (response.autores && response.autores[0] ? 
                       (response.autores[0].nome || response.autores[0].name) : null) ||
                     'Autor desconhecido';
        
        this.autorCache.set(idLivro, {
          autor: autor,
          timestamp: agora
        });
        return autor;
      }),
      catchError(() => {
        const autoresFallback: { [id: number]: string } = {
          1: 'J.R.R. Tolkien',
          2: 'Machado de Assis', 
          3: 'Jorge Amado',
          4: 'Clarice Lispector',
          5: 'Graciliano Ramos',
          6: 'Ariano Suassuna',
          7: 'Jorge Amado',
          8: 'Machado de Assis',
          9: 'Aluísio Azevedo',
          10: 'José de Alencar'
        };
        
        const autorFallback = autoresFallback[idLivro] || 'Autor desconhecido';
        
        return of(autorFallback);
      })
    );
  }

  private extrairAutorDosdados(livro: any, item: any): string | null {
    let autor = null;
    
    if (livro.autor) {
      autor = typeof livro.autor === 'string' ? livro.autor : livro.autor.nome;
    } else if (livro.autores && livro.autores.length > 0) {
      autor = livro.autores[0].nome || livro.autores[0].name;
    } else if (livro.author) {
      autor = typeof livro.author === 'string' ? livro.author : livro.author.nome;
    }
    
    if (!autor && item.autor) {
      autor = typeof item.autor === 'string' ? item.autor : item.autor.nome;
    }
    
    if (!autor) {
      autor = this.extrairAutor(livro);
    }
    
    return autor;
  }

  private extrairAutor(livro: any): string | null {
    if (!livro) {
      return null;
    }

    const autoresPorTitulo: { [titulo: string]: string } = {
      'Vidas Secas': 'Graciliano Ramos',
      'Capitães da Areia': 'Jorge Amado',
      'Dom Casmurro': 'Machado de Assis',
      'O Auto da Compadecida': 'Ariano Suassuna',
      'A Hora da Estrela': 'Clarice Lispector',
      'Gabriela, Cravo e Canela': 'Jorge Amado',
      'O Cortiço': 'Aluísio Azevedo',
      'O Guarani': 'José de Alencar',
      'Memórias Póstumas de Brás Cubas': 'Machado de Assis'
    };

    if (livro.titulo && autoresPorTitulo[livro.titulo]) {
      return autoresPorTitulo[livro.titulo];
    }

    if (livro.autor) {
      if (typeof livro.autor === 'string') {
        return livro.autor;
      }
      if (livro.autor.nome) {
        return livro.autor.nome;
      }
    }

    if (livro.author) {
      if (typeof livro.author === 'string') {
        return livro.author;
      }
      if (livro.author.nome || livro.author.name) {
        return livro.author.nome || livro.author.name;
      }
    }

    if (livro.autores && Array.isArray(livro.autores) && livro.autores.length > 0) {
      const primeiroAutor = livro.autores[0];
      if (typeof primeiroAutor === 'string') {
        return primeiroAutor;
      }
      if (primeiroAutor.nome) {
        return primeiroAutor.nome;
      }
      if (primeiroAutor.name) {
        return primeiroAutor.name;
      }
    }

    if (livro.authors && Array.isArray(livro.authors) && livro.authors.length > 0) {
      const primeiroAutor = livro.authors[0];
      if (typeof primeiroAutor === 'string') {
        return primeiroAutor;
      }
      if (primeiroAutor.nome || primeiroAutor.name) {
        return primeiroAutor.nome || primeiroAutor.name;
      }
    }

    if (livro.escritor) {
      return livro.escritor;
    }
    if (livro.writer) {
      return livro.writer;
    }
    return null;
  }
}
