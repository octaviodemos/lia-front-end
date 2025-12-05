import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { LivroService } from '../../services/livro.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { AuthService } from '../../services/auth';
import { getGeneroLabel as getGeneroLabelFn, getImagemUrl as getImagemUrlFn, getAutorNome as getAutorNomeFn, temPreco as temPrecoFn } from '../../utils/livro-utils';
import { AvaliacaoForm } from '../../components/avaliacao-form/avaliacao-form';

const PENDING_STORAGE_KEY = 'pendingAvaliacoes';
const MAX_PENDING_ITEMS = 50;
const LOCAL_ID_PREFIX = 'local_';
const SUCCESS_MESSAGE_DURATION = 3000;
const EVALUATION_SUCCESS_DURATION = 4000;

@Component({
  selector: 'app-livro-detalhes',
  standalone: true,
  imports: [CommonModule, RouterLink, AvaliacaoForm],
  templateUrl: './livro-detalhes.html',
  styleUrls: ['./livro-detalhes.scss']
})
export class LivroDetalhes implements OnInit {

  livro: any = null;
  avaliacoes: any[] = [];
  pendingAvaliacoes: any[] = [];
  livroId: string = '';
  mensagemSucesso: string = '';

  constructor(
    private route: ActivatedRoute,
    private livroService: LivroService,
    private carrinhoService: CarrinhoService,
    private avaliacaoService: AvaliacaoService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        this.livroId = params.get('id') || '';
        if (this.livroId) {
          this.loadPendingFromStorage();
          this.carregarAvaliacoes();
          return this.livroService.getLivroById(this.livroId);
        }
        return [];
      })
    ).subscribe({
      next: (data: any) => this.livro = data,
      error: (err: any) => {}
    });
  }

  carregarAvaliacoes(): void {
    this.avaliacaoService.getAvaliacoesPorLivro(this.livroId).subscribe({
      next: (data: any) => {
        const list = this.normalizeAvaliacoesList(data);
        this.avaliacoes = list.map(this.normalizeAvaliacao.bind(this));
        this.reconcilePendingWithApproved();
      },
      error: () => {} // Erro silencioso
    });
  }

  private normalizeAvaliacoesList(data: any): any[] {
    return Array.isArray(data) ? data : (data?.data || data || []);
  }

  private normalizeAvaliacao(avaliacao: any): any {
    const autor = this.extractAuthor(avaliacao);
    
    return {
      ...avaliacao,
      autor,
      likes: avaliacao.likes ?? avaliacao.likesCount ?? 0,
      dislikes: avaliacao.dislikes ?? 0,
      userReaction: avaliacao.userReaction ?? (avaliacao.userLiked ? 'LIKE' : null),
      _reactionLoading: false
    };
  }

  private extractAuthor(avaliacao: any): any {
    const autorFromPayload = avaliacao.autor || avaliacao.user || avaliacao.usuario || avaliacao.autor_usuario;
    const nomeFromFields = avaliacao.autor_nome || avaliacao.user_name || avaliacao.nome || avaliacao.name;
    
    if (autorFromPayload) {
      return typeof autorFromPayload === 'string' ? { nome: autorFromPayload } : autorFromPayload;
    }
    
    return nomeFromFields ? { nome: nomeFromFields } : null;
  }

  /**
   * Reconcilia avaliações pendentes com as aprovadas, removendo duplicatas
   */
  private reconcilePendingWithApproved(): void {
    try {
      const pendingItems = this.getPendingFromStorage();
      if (!pendingItems.length) return;
      
      const filtered = pendingItems.filter(item => this.shouldKeepPendingItem(item));
      
      this.savePendingItemsToStorage(filtered);
      this.pendingAvaliacoes = this.filterItemsByLivro(filtered);
    } catch (error) {
      // Falha silenciosa na reconciliação
    }
  }

  private shouldKeepPendingItem(item: any): boolean {
    // Manter itens de outros livros
    if (String(item.livroId) !== String(this.livroId)) {
      return true;
    }
    
    const itemId = item.id_avaliacao || item.id;
    
    // Sempre manter itens com ID local temporário
    if (itemId?.toString().startsWith(LOCAL_ID_PREFIX)) {
      return true;
    }
    
    // Remover se já existe nas aprovadas
    if (itemId && this.isItemApproved(itemId)) {
      return false;
    }
    
    return true;
  }

  private isItemApproved(itemId: string): boolean {
    return this.avaliacoes.some(avaliacao => {
      const avaliacaoId = avaliacao.id_avaliacao || avaliacao.id;
      return avaliacaoId && String(avaliacaoId) === String(itemId);
    });
  }



  onNovaAvaliacao(novaAvaliacao: any): void {
    const isApproved = this.isAvaliacaoApproved(novaAvaliacao);
    
    if (isApproved) {
      this.handleApprovedAvaliacao(novaAvaliacao);
    } else {
      this.handlePendingAvaliacao(novaAvaliacao);
    }
  }

  private isAvaliacaoApproved(avaliacao: any): boolean {
    return avaliacao?.aprovado === true || avaliacao?.aprovado === 'true';
  }

  private handleApprovedAvaliacao(avaliacao: any): void {
    this.avaliacoes.unshift(avaliacao);
  }

  private handlePendingAvaliacao(avaliacao: any): void {
    const pendingItem = this.createPendingAvaliacao(avaliacao);
    
    this.pendingAvaliacoes.unshift(pendingItem);
    this.savePendingToStorage(pendingItem);
    
    this.showSuccessMessage('Sua avaliação foi enviada e ficará pendente de aprovação.', EVALUATION_SUCCESS_DURATION);
  }

  private createPendingAvaliacao(avaliacao: any): any {
    const currentUser = this.authService.getUser();
    const autor = this.getCurrentUserAuthor(currentUser, avaliacao);
    
    return {
      ...avaliacao,
      livroId: this.livroId,
      _pendente: true,
      autor,
      data_avaliacao: avaliacao.data_avaliacao || new Date().toISOString(),
      likesCount: avaliacao.likesCount ?? 0,
      userLiked: !!avaliacao.userLiked,
      _timestamp: Date.now()
    };
  }

  private getCurrentUserAuthor(currentUser: any, avaliacao: any): any {
    if (currentUser) {
      return { nome: currentUser.nome || currentUser.name };
    }
    return avaliacao.autor || null;
  }

  private loadPendingFromStorage(): void {
    try {
      const allPending = this.getPendingFromStorage();
      this.pendingAvaliacoes = this.filterItemsByLivro(allPending);
    } catch (error) {
      this.pendingAvaliacoes = [];
    }
  }

  private getPendingFromStorage(): any[] {
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  private savePendingItemsToStorage(items: any[]): void {
    try {
      const limitedItems = items.slice(0, MAX_PENDING_ITEMS);
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(limitedItems));
    } catch (error) {
      // Erro silencioso ao salvar
    }
  }

  private savePendingToStorage(item: any): void {
    try {
      const allPending = this.getPendingFromStorage();
      allPending.unshift(item);
      this.savePendingItemsToStorage(allPending);
    } catch (error) {
      // Erro silencioso ao salvar
    }
  }

  private filterItemsByLivro(items: any[]): any[] {
    return items.filter(item => String(item.livroId) === String(this.livroId));
  }

  // Toggle reaction (LIKE or DISLIKE) on an avaliacao with optimistic update
  toggleReaction(avaliacao: any, type: 'LIKE' | 'DISLIKE') {
    avaliacao.likes = avaliacao.likes ?? avaliacao.likesCount ?? 0;
    avaliacao.dislikes = avaliacao.dislikes ?? 0;
    avaliacao.userReaction = avaliacao.userReaction ?? (avaliacao.userLiked ? 'LIKE' : null);

    if (avaliacao._reactionLoading) return;
    avaliacao._reactionLoading = true;

    const prev = { likes: avaliacao.likes, dislikes: avaliacao.dislikes, userReaction: avaliacao.userReaction };

    if (prev.userReaction === type) {
      // toggle off
      if (type === 'LIKE') avaliacao.likes = Math.max(0, avaliacao.likes - 1);
      else avaliacao.dislikes = Math.max(0, avaliacao.dislikes - 1);
      avaliacao.userReaction = null;
    } else if (!prev.userReaction) {
      // new reaction
      if (type === 'LIKE') avaliacao.likes = avaliacao.likes + 1;
      else avaliacao.dislikes = avaliacao.dislikes + 1;
      avaliacao.userReaction = type;
    } else {
      // switch
      if (type === 'LIKE') { avaliacao.likes = avaliacao.likes + 1; avaliacao.dislikes = Math.max(0, avaliacao.dislikes - 1); }
      else { avaliacao.dislikes = avaliacao.dislikes + 1; avaliacao.likes = Math.max(0, avaliacao.likes - 1); }
      avaliacao.userReaction = type;
    }

    const id = avaliacao.id_avaliacao || avaliacao.id;
    if (!id) {
      // local pending evaluation — only local toggle
      avaliacao._reactionLoading = false;
      return;
    }

    this.avaliacaoService.postReaction(String(id), type).subscribe({
      next: (res: any) => {
        avaliacao.likes = res?.likes ?? avaliacao.likes;
        avaliacao.dislikes = res?.dislikes ?? avaliacao.dislikes;
        avaliacao.userReaction = res?.userReaction ?? avaliacao.userReaction;
        avaliacao._reactionLoading = false;
      },
      error: (err: any) => {
        // rollback
        avaliacao.likes = prev.likes;
        avaliacao.dislikes = prev.dislikes;
        avaliacao.userReaction = prev.userReaction;
        avaliacao._reactionLoading = false;
        if (err.status === 401) {
          alert('Você precisa estar logado para reagir a avaliações.');
        } else {
          alert('Erro ao processar reação. Tente novamente.');
        }
      }
    });
  }

  confirmDeleteAvaliacao(avaliacao: any): void {
    const authorName = this.getAuthorDisplayName(avaliacao);
    const confirmMessage = `Tem certeza que deseja excluir a avaliação de ${authorName}? Esta ação não pode ser desfeita.`;
    
    if (window.confirm(confirmMessage)) {
      this.deleteAvaliacao(avaliacao);
    }
  }

  private getAuthorDisplayName(avaliacao: any): string {
    return avaliacao.autor?.nome || 'esta avaliação';
  }

  deleteAvaliacao(avaliacao: any): void {
    const id = avaliacao.id_avaliacao || avaliacao.id;
    
    if (!id) {
      this.handleLocalDelete(avaliacao);
      return;
    }

    this.handleServerDelete(avaliacao, id);
  }

  private handleLocalDelete(avaliacao: any): void {
    this.removeFromLocalLists(avaliacao);
    this.updateLocalStorage(avaliacao);
  }

  private handleServerDelete(avaliacao: any, id: string): void {
    avaliacao._deleting = true;
    
    this.avaliacaoService.deleteAdminAvaliacao(id).subscribe({
      next: () => this.onDeleteSuccess(id),
      error: (err: any) => this.onDeleteError(avaliacao, err)
    });
  }

  private removeFromLocalLists(avaliacao: any): void {
    this.avaliacoes = this.avaliacoes.filter(a => a !== avaliacao);
    this.pendingAvaliacoes = this.pendingAvaliacoes.filter(p => p !== avaliacao);
  }

  private updateLocalStorage(excludeItem?: any): void {
    try {
      const allPending = this.getPendingFromStorage();
      let filtered: any[];
      
      if (excludeItem) {
        filtered = allPending.filter(x => x !== excludeItem);
      } else {
        filtered = allPending;
      }
      
      this.savePendingItemsToStorage(filtered);
    } catch (error) {
      // Erro silencioso ao atualizar localStorage
    }
  }

  private onDeleteSuccess(deletedId: string): void {
    this.avaliacoes = this.avaliacoes.filter(a => {
      const avaliacaoId = a.id_avaliacao || a.id;
      return String(avaliacaoId) !== String(deletedId);
    });
    
    this.updateStorageAfterDelete(deletedId);
    this.showSuccessMessage('Avaliação removida com sucesso.', SUCCESS_MESSAGE_DURATION);
  }

  private updateStorageAfterDelete(deletedId: string): void {
    try {
      const allPending = this.getPendingFromStorage();
      const filtered = allPending.filter(item => {
        const itemId = item.id_avaliacao || item.id || '';
        return String(itemId) !== String(deletedId);
      });
      
      this.savePendingItemsToStorage(filtered);
      this.pendingAvaliacoes = this.filterItemsByLivro(filtered);
    } catch (error) {
      // Erro silencioso ao atualizar localStorage
    }
  }

  private onDeleteError(avaliacao: any, error: any): void {
    avaliacao._deleting = false;
    
    if (error.status === 401) {
      alert('Você precisa estar logado como admin para excluir avaliações.');
    } else {
      alert('Erro ao excluir avaliação. Tente novamente.');
    }
  }

  temPreco(): boolean {
    return temPrecoFn(this.livro);
  }

  getAutorNome(): string {
    return getAutorNomeFn(this.livro);
  }

  getGeneroLabel(): string {
    return getGeneroLabelFn(this.livro);
  }

  getImagemUrl(): string {
    return getImagemUrlFn(this.livro);
  }

  adicionarAoCarrinho(): void {
    const validationError = this.validateLivroForCart();
    if (validationError) {
      this.showErrorMessage(validationError);
      return;
    }

    const cartItem = this.createCartItem();
    const idEstoque = this.getEstoqueId();

    this.carrinhoService.adicionarItem(idEstoque, 1, cartItem).subscribe({
      next: () => this.showCartSuccessMessage(),
      error: () => this.showCartSuccessMessage() // Fallback sempre mostra sucesso
    });
  }

  private validateLivroForCart(): string | null {
    if (!this.livro) {
      return '❌ Erro: livro não encontrado';
    }

    if (!this.temPreco()) {
      return '❌ Este livro não está disponível para compra';
    }

    return null;
  }

  private createCartItem(): any {
    const preco = this.livro.estoque.preco;
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;

    return {
      livroId: String(this.livro.id_livro || this.livro.id),
      titulo: this.livro.titulo || 'Livro sem título',
      autor: this.getAutorNome(),
      preco: precoNum,
      quantidade: 1,
      imagemUrl: this.livro.capa_url
    };
  }

  private getEstoqueId(): number {
    return Number(this.livro.estoque?.id_estoque || this.livro.id_livro);
  }

  private showErrorMessage(message: string): void {
    this.showMessage(message, SUCCESS_MESSAGE_DURATION);
  }

  private showCartSuccessMessage(): void {
    this.showSuccessMessage('✅ Livro adicionado ao carrinho com sucesso!', SUCCESS_MESSAGE_DURATION);
  }

  private showSuccessMessage(message: string, duration: number): void {
    this.showMessage(message, duration);
  }

  private showMessage(message: string, duration: number): void {
    this.mensagemSucesso = message;
    setTimeout(() => {
      this.mensagemSucesso = '';
    }, duration);
  }
}