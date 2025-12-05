import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError, forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from './auth';

export interface ItemCarrinho {
  livroId: string;
  cartItemId?: number; // ID do item no carrinho do backend
  titulo: string;
  autor: string;
  preco: number;
  quantidade: number;
  imagemUrl?: string;
  estoqueDisponivel?: number;
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
  
  // Cache de estoque para evitar requisições excessivas
  private estoqueCache = new Map<number, {disponivel: number, timestamp: number}>();
  private autorCache = new Map<number, {autor: string, timestamp: number}>();
  private readonly CACHE_DURATION = 30000; // 30 segundos

  constructor(private http: HttpClient, private authService: AuthService) {
    this.carregarCarrinhoDoStorage();
  }

  /**
   * Retorna um Observable com os itens do carrinho
   */
  /**
   * Retorna um Observable com os itens do carrinho (estado local)
   * NOTA: não faz fetch automático do backend — chame refreshCarrinho() quando quiser forçar sync.
   */
  getCarrinho(): Observable<ItemCarrinho[]> {
    return this.carrinho$.asObservable();
  }

  /**
   * Faz fetch do carrinho no backend (quando autenticado) e atualiza o estado local
   */
  refreshCarrinho(): Observable<ItemCarrinho[]> {
    const token = this.authService.getToken();
    if (!token) {
      return of(this.getCarrinhoAtual());
    }

    return this.http.get(`${this.apiUrl}/cart`).pipe(
      map(res => this.mapCartResponse(res)),
      tap((backendItems: ItemCarrinho[]) => {
        const currentItems = this.getCarrinhoAtual();
        
        // sync info removed
        
        // Filtrar itens que foram removidos localmente
        const itensRemovidosLocal = this.getItensRemovidosLocal();
        if (itensRemovidosLocal.length > 0) {
          const itensAntes = backendItems.length;
          backendItems = backendItems.filter(item => {
            const foiRemovido = itensRemovidosLocal.some(removido => 
              removido.livroId === item.livroId || removido.cartItemId === item.cartItemId
            );
            if (foiRemovido) {
            
            }
            return !foiRemovido;
          });
        
        }
        
        // Se o backend retornou vazio, mas temos itens no localStorage
        if (backendItems.length === 0 && currentItems.length > 0) {
          
          return; // Não atualizar o estado
        }
        
        // Atualizar com dados do backend
        this.carrinho$.next(backendItems);
      }),
      map(() => this.getCarrinhoAtual()),
      catchError(() => {
        return of(this.getCarrinhoAtual());
      })
    );
  }

  /**
   * Retorna o valor atual do carrinho (snapshot)
   */
  getCarrinhoAtual(): ItemCarrinho[] {
    return this.carrinho$.value;
  }

  /**
   * Adiciona um item ao carrinho ou incrementa quantidade se já existir
   */
  // preserva lógica local para atualizar o estado sem chamar backend
  adicionarItemLocal(item: ItemCarrinho): void {
    const carrinhoAtual = this.getCarrinhoAtual();
    const itemExistente = carrinhoAtual.find(i => i.livroId === item.livroId);

    if (itemExistente) {
      itemExistente.quantidade += item.quantidade;
    } else {
      carrinhoAtual.push(item);
    }

    this.atualizarCarrinho(carrinhoAtual);
  }

  /**
   * Verifica disponibilidade no estoque com cache para otimizar performance
   */
  verificarEstoque(id_estoque: number): Observable<{disponivel: number, suficiente: boolean}> {
    const agora = Date.now();
    const dadosCache = this.estoqueCache.get(id_estoque);
    
    // Verificar se tem cache válido
    if (dadosCache && (agora - dadosCache.timestamp) < this.CACHE_DURATION) {
      return of({
        disponivel: dadosCache.disponivel,
        suficiente: dadosCache.disponivel > 0
      });
    }
    return this.http.get(`${this.apiUrl}/stock/${id_estoque}`).pipe(
      map((estoque: any) => {
        // Tentar diferentes possibilidades de campo na resposta
        const disponivel = estoque.quantidade_disponivel || 
                          estoque.quantidade || 
                          estoque.stock || 
                          estoque.available ||
                          estoque.disponivel ||
                          (typeof estoque === 'number' ? estoque : 0);
        
        // Salvar no cache
        this.estoqueCache.set(id_estoque, {
          disponivel: disponivel,
          timestamp: agora
        });
        
        return {
          disponivel: disponivel,
          suficiente: disponivel > 0
        };
      }),
      catchError(error => {
        console.error(`❌ Erro ao verificar estoque para ID ${id_estoque}:`, error);
        
        // Usar dados da sua tabela real como fallback
        const estoqueRealTabela = {
          1: 10, 2: 10, 3: 8, 4: 5, 5: 6, 6: 7, 7: 4, 8: 9, 9: 3, 10: 2, 11: 1
        };
        
        const disponivel = estoqueRealTabela[id_estoque as keyof typeof estoqueRealTabela] || 0;
        
        // Salvar no cache mesmo sendo fallback
        this.estoqueCache.set(id_estoque, {
          disponivel: disponivel,
          timestamp: Date.now()
        });
        
        return of({ disponivel: disponivel, suficiente: disponivel > 0 });
      })
    );
  }

  /**
   * Adiciona um item ao carrinho com validação de estoque
   */
  adicionarItem(id_estoque: number, quantidade: number, meta?: Partial<ItemCarrinho>): Observable<ItemCarrinho[]> {
    // Primeiro verificar estoque
    return this.verificarEstoque(id_estoque).pipe(
      switchMap((estoque) => {
        if (!estoque.suficiente || estoque.disponivel < quantidade) {
          const erro = {
            status: 400,
            error: {
              message: `Estoque insuficiente. Disponível: ${estoque.disponivel}, Solicitado: ${quantidade}`,
              estoqueDisponivel: estoque.disponivel,
              type: 'ESTOQUE_INSUFICIENTE'
            }
          };
          return throwError(() => erro);
        }

          // Se tem estoque, adicionar normalmente
        return this.http.post(`${this.apiUrl}/cart/items`, { id_estoque, quantidade }).pipe(
          switchMap(() => this.http.get(`${this.apiUrl}/cart`)),
          map(res => this.mapCartResponse(res)),
          tap(items => this.carrinho$.next(items)),
          catchError((err) => {
            if (err && (err.status === 401)) {
              // 401: Não autenticado - save local
              const localItem = this.buildLocalItemFromMeta(id_estoque, quantidade, meta);
              if (localItem.estoqueDisponivel === undefined) {
                localItem.estoqueDisponivel = estoque.disponivel;
              }
              this.adicionarItemLocal(localItem);
              return of(this.getCarrinhoAtual());
            }
            return throwError(() => err);
          })
        );
      })
    );
  }

  /**
   * Constrói um ItemCarrinho usando metadados opcionais, com valores sensíveis a tipos
   */
  private buildLocalItemFromMeta(id_estoque: number, quantidade: number, meta?: Partial<ItemCarrinho>): ItemCarrinho {
    const preco = typeof meta?.preco === 'number' ? meta!.preco : (meta?.preco ? Number(String(meta.preco).replace(',', '.')) || 0 : 0);
    return {
      livroId: meta?.livroId ?? String(id_estoque),
      titulo: meta?.titulo ?? 'Produto',
      autor: meta?.autor ?? '',
      preco,
      quantidade,
      imagemUrl: meta?.imagemUrl ?? '',
      estoqueDisponivel: meta?.estoqueDisponivel,
      estoqueId: id_estoque
    } as ItemCarrinho;
  }

  /**
   * Normaliza a resposta do backend para um array de ItemCarrinho
   */
  private mapCartResponse(res: any): ItemCarrinho[] {
    
    if (!res) return [];
    
    let items: any[] = [];
    
    // Diferentes formatos de resposta possíveis
    if (Array.isArray(res)) {
      items = res;
    } else if (res.itens && Array.isArray(res.itens)) {
      items = res.itens;
    } else if (res.items && Array.isArray(res.items)) {
      items = res.items;
    } else if (res.data && Array.isArray(res.data)) {
      items = res.data;
    } else {
      // unrecognized response format
    }
    
    const itensMapeados = items.map((item: any) => {
      // Baseado na estrutura real: item.estoque.livro
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
        // Informações de estoque
        estoqueDisponivel: estoque.quantidade_disponivel || estoque.quantidade || 0,
        estoqueId: item.id_estoque || estoque.id_estoque,
        preco: this.parsePrice(
          // Tentar vários campos de preço
          item.preco_unitario || 
          item.preco_original || 
          item.preco || 
          livro.preco_original ||
          livro.preco_unitario ||
          livro.preco || 
          livro.valor ||
          livro.price ||
          // Se estoque.preco não for "0.00", usar ele
          (estoque.preco && estoque.preco !== "0.00" ? estoque.preco : null) ||
          // Campos alternativos
          estoque.valor ||
          estoque.price ||
          item.valor ||
          item.price ||
          // FALLBACK: usar preços conhecidos baseados no id_livro (temporário até backend ser corrigido)
          this.getFallbackPrice(livro.id_livro) ||
          0
        ),
        quantidade: item.quantidade || 1,
        imagemUrl: 
          livro.capa_url || 
          livro.image || 
          livro.imagemUrl ||
          item.imagemUrl || 
          ''
      };
      
      return mapped;
    });

    return itensMapeados;
  }

  private parsePrice(price: any): number {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      // Remove caracteres não numéricos exceto vírgula e ponto
      const cleanPrice = price.replace(/[^\d,.-]/g, '').replace(',', '.');
      const parsed = parseFloat(cleanPrice);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Fallback temporário para preços até o backend ser corrigido
   * Baseado nos preços que vimos nos logs da loja
   */
  private getFallbackPrice(idLivro: number): number {
    const precosFallback: { [key: number]: number } = {
      1: 49.90, // O Senhor dos Anéis
      2: 39.90, // Dom Casmurro
      3: 44.90, // Gabriela, Cravo e Canela
      4: 29.90, // A Hora da Estrela
      5: 34.90, // Vidas Secas
      6: 24.90, // O Auto da Compadecida
      7: 32.50, // Capitães da Areia
      8: 37.00, // Memórias Póstumas de Brás Cubas
      9: 28.00, // O Cortiço
      10: 19.90, // O Guarani
      11: 20.00  // teste
    };
    
    return precosFallback[idLivro] || 0;
  }

  /**
   * Remove um item do carrinho
   */
  removerItem(livroId: string): void {
    // Encontrar o item antes de remover (para ter os dados)
    const carrinhoAtual = this.getCarrinhoAtual();
    const itemRemovido = carrinhoAtual.find(i => i.livroId === livroId);
    
    if (!itemRemovido) {
      return;
    }
    
    // Remover localmente primeiro
    const carrinhoNovo = carrinhoAtual.filter(item => item.livroId !== livroId);
    this.atualizarCarrinho(carrinhoNovo);
    
    // TODO: Remover lista negra quando backend estiver funcionando
    // this.adicionarItemRemovidoLocal(itemRemovido);
    
    
    // Tentar remover do backend via atualização do carrinho
    const token = this.authService.getToken();
    if (token && itemRemovido.cartItemId) {
      // Como DELETE não existe, vamos atualizar cada item restante no carrinho
      this.sincronizarCarrinhoComBackend(carrinhoNovo);

    } else if (token && !itemRemovido.cartItemId) {
    } else {
    }
  }

  /**
   * Verifica se é possível incrementar a quantidade de um item
   */
  podeIncrementar(livroId: string): boolean {
    const item = this.getCarrinhoAtual().find(i => i.livroId === livroId);
    if (!item || !item.estoqueDisponivel) return true; // Assume disponível se não há info
    
    return item.quantidade < item.estoqueDisponivel;
  }

  /**
   * Atualiza a quantidade de um item específico com validação de estoque
   */
  atualizarQuantidade(livroId: string, quantidade: number): Observable<{sucesso: boolean, erro?: string}> {
    const carrinhoAtual = this.getCarrinhoAtual();
    const item = carrinhoAtual.find(i => i.livroId === livroId);

    if (!item) {
      return of({sucesso: false, erro: 'Item não encontrado no carrinho'});
    }

    if (quantidade <= 0) {
      this.removerItem(livroId);
      return of({sucesso: true});
    }

    // Verificar se tem estoque suficiente
    if (item.estoqueDisponivel && quantidade > item.estoqueDisponivel) {
      return of({
        sucesso: false, 
        erro: `Estoque insuficiente. Disponível: ${item.estoqueDisponivel}`
      });
    }

    // Atualizar quantidade
    item.quantidade = quantidade;
    this.atualizarCarrinho(carrinhoAtual);
    
    // Sincronizar com backend
    if (item.estoqueId) {
      this.sincronizarCarrinhoComBackend(carrinhoAtual);
    }

    return of({sucesso: true});
  }

  /**
   * Método legacy para compatibilidade (sem validação)
   */
  atualizarQuantidadeSemValidacao(livroId: string, quantidade: number): void {
    const carrinhoAtual = this.getCarrinhoAtual();
    const item = carrinhoAtual.find(i => i.livroId === livroId);

    if (item) {
      if (quantidade <= 0) {
        this.removerItem(livroId);
      } else {
        item.quantidade = quantidade;
        this.atualizarCarrinho(carrinhoAtual);
      }
    }
  }

  /**
   * Limpa todos os itens do carrinho
   */
  limparCarrinho(): void {
    // Limpar localmente
    this.atualizarCarrinho([]);
    
    // Limpar no backend se estiver autenticado
    const token = this.authService.getToken();
    if (token) {
      this.http.delete(`${this.apiUrl}/cart`).subscribe({
        next: () => {/* cart cleared on backend */},
        error: (err) => {/* error clearing cart on backend */}
      });
    }
  }

  /**
   * Retorna o total de itens no carrinho
   */
  getTotalItens(): number {
    return this.getCarrinhoAtual().reduce(
      (total, item) => total + item.quantidade, 
      0
    );
  }

  /**
   * Retorna o valor total do carrinho
   */
  getValorTotal(): number {
    return this.getCarrinhoAtual().reduce(
      (total, item) => total + (item.preco * item.quantidade), 
      0
    );
  }

  /**
   * Atualiza o carrinho e persiste no localStorage
   */
  private atualizarCarrinho(carrinho: ItemCarrinho[]): void {
    this.carrinho$.next(carrinho);
    this.salvarCarrinhoNoStorage(carrinho);
  }

  /**
   * Salva o carrinho no localStorage
   */
  private salvarCarrinhoNoStorage(carrinho: ItemCarrinho[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(carrinho));
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error);
    }
  }

  /**
   * Retorna o carrinho do localStorage sem modificar o BehaviorSubject
   */
  private getCarrinhoDoStorage(): ItemCarrinho[] {
    try {
      const carrinhoSalvo = localStorage.getItem(this.STORAGE_KEY);
      
      if (carrinhoSalvo) {
        const carrinho = JSON.parse(carrinhoSalvo) as ItemCarrinho[];
        return carrinho;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erro ao ler carrinho do localStorage:', error);
      return [];
    }
  }

  /**
   * Carrega o carrinho do localStorage
   */
  private carregarCarrinhoDoStorage(): void {
    const carrinho = this.getCarrinhoDoStorage();
    this.carrinho$.next(carrinho);
  }

  /**
   * Adiciona um item à lista de itens removidos localmente
   */
  private adicionarItemRemovidoLocal(item: ItemCarrinho): void {
    try {
      const itensRemovidos = this.getItensRemovidosLocal();
      const itemRemovido = {
        livroId: item.livroId,
        cartItemId: item.cartItemId,
        titulo: item.titulo,
        removidoEm: new Date().toISOString()
      };
      
      // Verificar se já existe
      const jaExiste = itensRemovidos.some(removido => 
        removido.livroId === item.livroId || 
        (removido.cartItemId && item.cartItemId && removido.cartItemId === item.cartItemId)
      );
      
      if (!jaExiste) {
        itensRemovidos.push(itemRemovido);
        localStorage.setItem(this.REMOVED_ITEMS_KEY, JSON.stringify(itensRemovidos));
      }
    } catch (error) {
      console.error('❌ Erro ao salvar item removido:', error);
    }
  }

  /**
   * Retorna a lista de itens removidos localmente
   */
  private getItensRemovidosLocal(): any[] {
    try {
      const itensRemovidos = localStorage.getItem(this.REMOVED_ITEMS_KEY);
      if (itensRemovidos) {
        const lista = JSON.parse(itensRemovidos);
        // Limpar itens removidos há mais de 24 horas (para não crescer infinitamente)
        const agora = new Date().getTime();
        const lista24h = lista.filter((item: any) => {
          const removidoEm = new Date(item.removidoEm).getTime();
          return (agora - removidoEm) < 24 * 60 * 60 * 1000; // 24 horas
        });
        
        // Salvar lista filtrada de volta
        if (lista24h.length !== lista.length) {
          localStorage.setItem(this.REMOVED_ITEMS_KEY, JSON.stringify(lista24h));
        }
        
        return lista24h;
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao ler itens removidos:', error);
      return [];
    }
  }

  /**
   * Atualiza informações de estoque para todos os itens do carrinho (otimizado com cache)
   */
  atualizarInfoEstoque(): Observable<ItemCarrinho[]> {
    const carrinhoAtual = this.getCarrinhoAtual();
    
    if (carrinhoAtual.length === 0) {
      return of(carrinhoAtual);
    }

    // updating stock info (with cache)
    
    // Agrupar itens únicos por ID para evitar duplicatas
    const idsUnicos = new Set<number>();
    carrinhoAtual.forEach(item => {
      const id = item.estoqueId || parseInt(item.livroId);
      if (id && !isNaN(id)) {
        idsUnicos.add(id);
      }
    });
    
    // Buscar estoque apenas para IDs únicos
    const estoqueRequests = Array.from(idsUnicos).map(id => 
      this.verificarEstoque(id).pipe(
        map(estoque => ({ id, disponivel: estoque.disponivel })),
        catchError(() => of({ id, disponivel: 0 }))
      )
    );

    if (estoqueRequests.length === 0) {
      return of(carrinhoAtual);
    }

    return forkJoin(estoqueRequests).pipe(
      map(estoques => {
        // Criar mapa de estoque por ID
        const estoqueMap = new Map<number, number>();
        estoques.forEach(e => estoqueMap.set(e.id, e.disponivel));
        
        // Atualizar itens com informações de estoque
        return carrinhoAtual.map(item => {
          const id = item.estoqueId || parseInt(item.livroId);
          const estoqueDisponivel = estoqueMap.get(id) ?? 0;
          return { ...item, estoqueDisponivel };
        });
      }),
      tap(itensAtualizados => {
        this.carrinho$.next(itensAtualizados);
      }),
      catchError(() => {
        return of(carrinhoAtual);
      })
    );
  }

  /**
   * Remove um item da lista negra (quando remoção do backend é bem-sucedida)
   */
  private removerItemDaListaNegra(item: ItemCarrinho): void {
    try {
      const itensRemovidos = this.getItensRemovidosLocal();
      const novaLista = itensRemovidos.filter(removido => 
        removido.livroId !== item.livroId && 
        removido.cartItemId !== item.cartItemId
      );
      
      if (novaLista.length !== itensRemovidos.length) {
        localStorage.setItem(this.REMOVED_ITEMS_KEY, JSON.stringify(novaLista));
      }
    } catch (error) {
      console.error('❌ Erro ao remover item da lista negra:', error);
    }
  }

  /**
   * Sincroniza o carrinho local com o backend recriando todos os itens
   */
  private sincronizarCarrinhoComBackend(itensLocais: ItemCarrinho[]): void {
    // syncing items with backend
    
    // Primeiro, limpar o carrinho no backend
    this.http.delete(`${this.apiUrl}/cart`).subscribe({
      next: () => {
        // backend cart cleared
        if (itensLocais.length > 0) {
          this.recriarItensNoBackend(itensLocais);
        }
      },
      error: (err) => {
        // error clearing backend cart
      }
    });
  }

  /**
   * Recria os itens locais no backend
   */
  private recriarItensNoBackend(itens: ItemCarrinho[]): void {
    let processados = 0;
    const total = itens.length;
    
    // recreating items in backend
    
    itens.forEach((item, index) => {
      // Usar o id_estoque para recriar o item
      const id_estoque = parseInt(item.livroId); // Assumindo que livroId é o id_estoque
      
      this.http.post(`${this.apiUrl}/cart/items`, { 
        id_estoque, 
        quantidade: item.quantidade 
      }).subscribe({
        next: () => {
          processados++;
        },
        error: (err) => {
          processados++;
        }
      });
    });
  }

  /**
   * Limpa o cache de estoque (útil quando houver mudanças)
   */
  limparCacheEstoque(): void {
    this.estoqueCache.clear();
  }

  /**
   * Força atualização do estoque (limpa cache e recarrega)
   */
  forcarAtualizacaoEstoque(): Observable<ItemCarrinho[]> {
    this.limparCacheEstoque();
    return this.atualizarInfoEstoque();
  }

  /**
   * Busca o autor do livro na tabela autores
   */
  buscarAutor(idLivro: number): Observable<string> {
    const agora = Date.now();
    const dadosCache = this.autorCache.get(idLivro);
    
    // Verificar se tem cache válido
    if (dadosCache && (agora - dadosCache.timestamp) < this.CACHE_DURATION) {
      return of(dadosCache.autor);
    }
    
    return this.http.get(`${this.apiUrl}/livros/${idLivro}/autor`).pipe(
      map((response: any) => {
        // Tentar diferentes estruturas da resposta
        const autor = response.autor || 
                     response.nome || 
                     response.name ||
                     (response.autores && response.autores[0] ? 
                       (response.autores[0].nome || response.autores[0].name) : null) ||
                     'Autor desconhecido';
        
        // Salvar no cache
        this.autorCache.set(idLivro, {
          autor: autor,
          timestamp: agora
        });
        return autor;
      }),
      catchError(error => {
        console.error(`❌ Erro ao buscar autor para livro ${idLivro}:`, error);
        
        // Fallback com autores conhecidos
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
        // using author fallback
        
        return of(autorFallback);
      })
    );
  }

  /**
   * Extrai autor diretamente dos dados que já vêm do backend (carrinho completo)
   */
  private extrairAutorDosdados(livro: any, item: any): string | null {
    // extracting author from provided data

    // Primeiro tentar pegar dos dados do livro que já vêm completos
    let autor = null;
    
    // Diferentes formatos possíveis do backend
    if (livro.autor) {
      autor = typeof livro.autor === 'string' ? livro.autor : livro.autor.nome;
    } else if (livro.autores && livro.autores.length > 0) {
      autor = livro.autores[0].nome || livro.autores[0].name;
    } else if (livro.author) {
      autor = typeof livro.author === 'string' ? livro.author : livro.author.nome;
    }
    
    // Se não encontrou no livro, tentar no item diretamente
    if (!autor && item.autor) {
      autor = typeof item.autor === 'string' ? item.autor : item.autor.nome;
    }
    
    // Se ainda não encontrou, usar o método de fallback existente
    if (!autor) {
      autor = this.extrairAutor(livro);
    }
    
    // author extracted
    return autor;
  }

  /**
   * Extrai o nome do autor de diferentes formatos possíveis (método fallback)
   */
  private extrairAutor(livro: any): string | null {
    if (!livro) {
      return null;
    }

    // Mapeamento de autores conhecidos por título do livro
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

    // Tentar buscar por título primeiro
    if (livro.titulo && autoresPorTitulo[livro.titulo]) {
      const autor = autoresPorTitulo[livro.titulo];
      return autor;
    }

    // Tentar diferentes estruturas de autor
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
        const nome = livro.author.nome || livro.author.name;
        return nome;
      }
    }

    // Array de autores
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
        const nome = primeiroAutor.nome || primeiroAutor.name;
        return nome;
      }
    }

    // Campos alternativos
    if (livro.escritor) {
      return livro.escritor;
    }
    if (livro.writer) {
      return livro.writer;
    }
    return null;
  }
}