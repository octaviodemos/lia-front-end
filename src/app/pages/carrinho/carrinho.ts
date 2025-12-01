import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CarrinhoService, ItemCarrinho } from '../../services/carrinho.service';

interface Cart {
  items: ItemCarrinho[];
  total: number;
  totalItens: number;
}

@Component({
  selector: 'app-carrinho',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrinho.html',
  styleUrls: ['./carrinho.scss']
})
export class Carrinho implements OnInit, OnDestroy {

  cart: Cart = {
    items: [],
    total: 0,
    totalItens: 0
  };

  private destroy$ = new Subject<void>();
  private estoqueCarregado = false;

  constructor(private carrinhoService: CarrinhoService) {}

  ngOnInit(): void {
    this.carregarCarrinho();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carrega os itens do carrinho
   */
  private carregarCarrinho(): void {
    this.carrinhoService.getCarrinho()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (itens: ItemCarrinho[]) => {
          console.log('🛒 Itens no carrinho:', itens);
          this.cart.items = itens;
          this.cart.total = this.carrinhoService.getValorTotal();
          this.cart.totalItens = this.carrinhoService.getTotalItens();
          
          console.log('💰 Total calculado:', this.cart.total);
          console.log('📦 Total de itens:', this.cart.totalItens);
          
          if (itens.length > 0) {
            console.log('🔍 Primeiro item:', {
              titulo: itens[0].titulo,
              preco: itens[0].preco,
              tipoPreco: typeof itens[0].preco,
              quantidade: itens[0].quantidade
            });
            
            // Carregar informações de estoque apenas uma vez por sessão
            if (!this.estoqueCarregado) {
              this.carrinhoService.atualizarInfoEstoque().subscribe();
              this.estoqueCarregado = true;
            }
          }
        },
        error: (err: Error) => {
          console.error('❌ Erro ao carregar carrinho:', err);
        }
      });
  }

  /**
   * Incrementa a quantidade de um item com validação de estoque
   */
  incrementarQuantidade(livroId: string, quantidadeAtual: number): void {
    // Verificar se pode incrementar
    if (!this.carrinhoService.podeIncrementar(livroId)) {
      const item = this.cart.items.find(i => i.livroId === livroId);
      const estoqueDisponivel = item?.estoqueDisponivel || 0;
      
      alert(`⚠️ Estoque insuficiente!\nDisponível: ${estoqueDisponivel} unidades\nVocê já tem ${quantidadeAtual} no carrinho.`);
      return;
    }

    this.carrinhoService.atualizarQuantidade(livroId, quantidadeAtual + 1).subscribe({
      next: (resultado) => {
        if (!resultado.sucesso && resultado.erro) {
          alert(`❌ ${resultado.erro}`);
        }
      },
      error: (err) => {
        console.error('Erro ao atualizar quantidade:', err);
        alert('❌ Erro ao atualizar quantidade');
      }
    });
  }

  /**
   * Decrementa a quantidade de um item
   */
  decrementarQuantidade(livroId: string, quantidadeAtual: number): void {
    if (quantidadeAtual > 1) {
      this.carrinhoService.atualizarQuantidade(livroId, quantidadeAtual - 1).subscribe({
        next: (resultado) => {
          if (!resultado.sucesso && resultado.erro) {
            alert(`❌ ${resultado.erro}`);
          }
        }
      });
    } else {
      this.removerItem(livroId);
    }
  }

  /**
   * Verifica se pode incrementar a quantidade de um item
   */
  podeIncrementar(livroId: string): boolean {
    return this.carrinhoService.podeIncrementar(livroId);
  }

  /**
   * Retorna a quantidade disponível no estoque
   */
  getEstoqueDisponivel(livroId: string): number {
    const item = this.cart.items.find(i => i.livroId === livroId);
    const estoque = item?.estoqueDisponivel || 0;
    // Log removido para evitar spam no console
    return estoque;
  }



  /**
   * Remove um item do carrinho
   */
  removerItem(livroId: string): void {
    if (confirm('Deseja remover este item do carrinho?')) {
      this.carrinhoService.removerItem(livroId);
    }
  }

  /**
   * Formata o preço para exibição
   */
  formatarPreco(preco: number): string {
    return preco.toFixed(2).replace('.', ',');
  }
}