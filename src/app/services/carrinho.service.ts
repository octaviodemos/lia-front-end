import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, catchError, switchMap, map } from 'rxjs/operators';
import { AuthService } from './auth';

export interface ItemCarrinho {
  livroId: string;
  titulo: string;
  autor: string;
  preco: number;
  quantidade: number;
  imagemUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CarrinhoService {
  
  private carrinho$ = new BehaviorSubject<ItemCarrinho[]>([]);
  private readonly STORAGE_KEY = 'lia_carrinho';
  private apiUrl = 'http://localhost:3333/api';

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
      tap(items => this.carrinho$.next(items)),
      catchError(() => of(this.getCarrinhoAtual()))
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
   * Adiciona um item ao carrinho no backend e atualiza o estado local
   */
  adicionarItem(id_estoque: string, quantidade: number, meta?: Partial<ItemCarrinho>): Observable<ItemCarrinho[]> {
    return this.http.post(`${this.apiUrl}/cart/items`, { id_estoque, quantidade }).pipe(
      switchMap(() => this.http.get(`${this.apiUrl}/cart`)),
      map(res => this.mapCartResponse(res)),
      tap(items => this.carrinho$.next(items)),
      catchError((err) => {
        if (err && (err.status === 401 || err.status === 400)) {
          // 401: Não autenticado | 400: Estoque insuficiente ou outros erros de validação
          const localItem = this.buildLocalItemFromMeta(id_estoque, quantidade, meta);
          this.adicionarItemLocal(localItem);
          return of(this.getCarrinhoAtual());
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Constrói um ItemCarrinho usando metadados opcionais, com valores sensíveis a tipos
   */
  private buildLocalItemFromMeta(id_estoque: string, quantidade: number, meta?: Partial<ItemCarrinho>): ItemCarrinho {
    const preco = typeof meta?.preco === 'number' ? meta!.preco : (meta?.preco ? Number(String(meta.preco).replace(',', '.')) || 0 : 0);
    return {
      livroId: meta?.livroId ?? String(id_estoque),
      titulo: meta?.titulo ?? 'Produto',
      autor: meta?.autor ?? '',
      preco,
      quantidade,
      imagemUrl: meta?.imagemUrl ?? ''
    } as ItemCarrinho;
  }

  /**
   * Normaliza a resposta do backend para um array de ItemCarrinho
   */
  private mapCartResponse(res: any): ItemCarrinho[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as ItemCarrinho[];
    if (res.items && Array.isArray(res.items)) return res.items as ItemCarrinho[];
    return [];
  }

  /**
   * Remove um item do carrinho
   */
  removerItem(livroId: string): void {
    const carrinhoAtual = this.getCarrinhoAtual().filter(
      item => item.livroId !== livroId
    );
    this.atualizarCarrinho(carrinhoAtual);
  }

  /**
   * Atualiza a quantidade de um item específico
   */
  atualizarQuantidade(livroId: string, quantidade: number): void {
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
   * Limpa todo o carrinho
   */
  limparCarrinho(): void {
    this.atualizarCarrinho([]);
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
   * Carrega o carrinho do localStorage
   */
  private carregarCarrinhoDoStorage(): void {
    try {
      const carrinhoSalvo = localStorage.getItem(this.STORAGE_KEY);
      if (carrinhoSalvo) {
        const carrinho = JSON.parse(carrinhoSalvo) as ItemCarrinho[];
        this.carrinho$.next(carrinho);
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error);
      this.carrinho$.next([]);
    }
  }
}