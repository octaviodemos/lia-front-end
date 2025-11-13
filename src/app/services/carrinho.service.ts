import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  constructor() {
    this.carregarCarrinhoDoStorage();
  }

  /**
   * Retorna um Observable com os itens do carrinho
   */
  getCarrinho(): Observable<ItemCarrinho[]> {
    return this.carrinho$.asObservable();
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
  adicionarItem(item: ItemCarrinho): void {
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