import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { LivroService } from '../../services/livro.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { AuthService } from '../../services/auth';
import { getGeneroLabel as getGeneroLabelFn, getImagemUrl as getImagemUrlFn, getAutorNome as getAutorNomeFn, temPreco as temPrecoFn } from '../../utils/livro-utils';
import { rotuloTipoImagemLegivel } from '../../utils/livro-imagem-helpers';
import { resolverUrlMidiaApi } from '../../utils/media-url';
import type { LivroImagem } from '../../models/livro-imagem';
import type { Estoque, Livro } from '../../models/livro';
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
  imagensGaleria: LivroImagem[] = [];
  indiceGaleria = 0;
  idEstoqueSelecionado: number | null = null;

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
      next: (data: any) => {
        this.livro = data;
        this.inicializarSelecaoEstoque();
        this.atualizarGaleria();
      },
      error: () => {}
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

  getOpcoesEstoque(): Estoque[] {
    if (!this.livro) return [];
    if (Array.isArray(this.livro.estoques) && this.livro.estoques.length) {
      return this.livro.estoques as Estoque[];
    }
    if (Array.isArray(this.livro.estoque)) {
      return this.livro.estoque as Estoque[];
    }
    if (this.livro.estoque) {
      return [this.livro.estoque as Estoque];
    }
    return [];
  }

  private inicializarSelecaoEstoque(): void {
    const opts = this.getOpcoesEstoque();
    const first = opts.find((o) => o.disponivel) || opts[0];
    this.idEstoqueSelecionado = first?.id_estoque != null ? Number(first.id_estoque) : null;
  }

  getEstoqueSelecionado(): Estoque | null {
    const opts = this.getOpcoesEstoque();
    if (!opts.length) return null;
    const id = this.idEstoqueSelecionado;
    if (id != null) {
      const found = opts.find((o) => Number(o.id_estoque) === id);
      if (found) return found;
    }
    return opts[0];
  }

  onChangeEstoqueSelecionado(ev: Event): void {
    const v = Number((ev.target as HTMLSelectElement).value);
    this.idEstoqueSelecionado = Number.isFinite(v) ? v : null;
  }

  formatOpcaoEstoque(e: Estoque): string {
    const p = e.preco != null && e.preco !== '' ? `R$ ${e.preco}` : '—';
    return `${p} — ${e.disponivel ? 'Disponível' : 'Vendido'}`;
  }

  getPrecoSelecionadoNumero(): number | null {
    const e = this.getEstoqueSelecionado();
    if (!e) return null;
    const raw = e.preco;
    if (raw == null || raw === '') return null;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  podeAdicionarAoCarrinho(): boolean {
    const e = this.getEstoqueSelecionado();
    if (!e || !e.disponivel) return false;
    return this.getPrecoSelecionadoNumero() !== null;
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

  getNotaConservacao(): number | null {
    if (!this.livro) return null;
    const n = this.livro.nota_conservacao;
    if (n === null || n === undefined) return null;
    const num = typeof n === 'string' ? parseFloat(n) : Number(n);
    if (!Number.isFinite(num)) return null;
    const arredondada = Math.round(num);
    if (arredondada < 1 || arredondada > 5) return null;
    return arredondada;
  }

  mostrarSecaoConservacao(): boolean {
    return this.getNotaConservacao() !== null;
  }

  ehConservacaoNotaMaxima(): boolean {
    return this.getNotaConservacao() === 5;
  }

  mostrarObservacoesEstadoFisico(): boolean {
    const n = this.getNotaConservacao();
    const texto = (this.livro?.descricao_conservacao ?? '').trim();
    return n !== null && n < 5 && texto.length > 0;
  }

  getDescricaoConservacao(): string {
    return (this.livro?.descricao_conservacao ?? '').trim();
  }

  getNotaMediaAvaliacoes(): number | null {
    if (!this.livro) return null;
    const v = this.livro.nota_media_avaliacoes;
    if (v === null || v === undefined || v === '') return null;
    const num = typeof v === 'string' ? parseFloat(v) : Number(v);
    if (!Number.isFinite(num)) return null;
    return Math.min(5, Math.max(0, Math.round(num * 10) / 10));
  }

  getTotalAvaliacoes(): number {
    if (!this.livro) return 0;
    const t = this.livro.total_avaliacoes;
    const n = typeof t === 'number' ? t : parseInt(String(t ?? '').trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  mostrarBlocoMediaComunidade(): boolean {
    return this.getNotaMediaAvaliacoes() !== null || this.getTotalAvaliacoes() > 0;
  }

  getClasseEstrelaMediaComunidade(indice: number): string {
    const m = this.getNotaMediaAvaliacoes();
    const baseVazia = 'fa-regular fa-star media-comunidade__estrela';
    const baseCheia = 'fa-solid fa-star media-comunidade__estrela media-comunidade__estrela--ativa';
    const baseMeia = 'fa-solid fa-star-half-stroke media-comunidade__estrela media-comunidade__estrela--ativa';
    if (m === null) return baseVazia;
    if (indice <= Math.floor(m + 1e-9)) return baseCheia;
    if (indice - 0.5 <= m + 1e-9 && m < indice) return baseMeia;
    return baseVazia;
  }

  getAriaLabelMediaComunidade(): string {
    const m = this.getNotaMediaAvaliacoes();
    const t = this.getTotalAvaliacoes();
    const rotuloContagem = t === 1 ? '1 avaliação' : `${t} avaliações`;
    if (m !== null) {
      return `Média ${m} de 5, ${rotuloContagem}`;
    }
    return rotuloContagem;
  }

  getOutrasOpcoes(): Livro[] {
    const arr = this.livro?.outras_opcoes;
    if (!Array.isArray(arr) || !arr.length) return [];
    const idAtual = this.livro?.id_livro;
    return arr.filter((o) => o && o.id_livro != null && Number(o.id_livro) !== Number(idAtual));
  }

  temOutrasOpcoes(): boolean {
    return this.getOutrasOpcoes().length > 0;
  }

  getImagemUrlOpcao(alvo: Livro): string {
    return getImagemUrlFn(alvo as any);
  }

  getPrecoNumeroDeLivro(alvo: Livro): number | null {
    const est = alvo.estoque;
    if (!est) return null;
    const raw = est.preco;
    if (raw == null || raw === '') return null;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  formatoPrecoOpcao(alvo: Livro): string {
    const n = this.getPrecoNumeroDeLivro(alvo);
    if (n === null) return 'Sob consulta';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  rotuloCondicaoOpcao(alvo: Livro): string {
    const c = alvo.estoque?.condicao ?? (alvo as any).condicao;
    if (!c) return 'Condição não informada';
    const map: Record<string, string> = {
      novo: 'Novo',
      usado_como_novo: 'Usado — Como novo',
      usado_bom: 'Usado — Bom',
      usado_aceitavel: 'Usado — Aceitável'
    };
    return map[String(c)] || String(c);
  }

  getNotaConservacaoOpcao(alvo: Livro): number | null {
    const n = alvo.nota_conservacao;
    if (n === null || n === undefined) return null;
    const num = typeof n === 'string' ? parseFloat(String(n)) : Number(n);
    if (!Number.isFinite(num)) return null;
    const ar = Math.round(num);
    if (ar < 1 || ar > 5) return null;
    return ar;
  }

  private atualizarGaleria(): void {
    const imgs = this.livro?.imagens;
    this.imagensGaleria = Array.isArray(imgs)
      ? imgs.filter((i: LivroImagem) => !!(i?.url_imagem && String(i.url_imagem).trim()))
      : [];
    if (!this.imagensGaleria.length) {
      this.indiceGaleria = 0;
      return;
    }
    const capaIx = this.imagensGaleria.findIndex((img) => img.tipo_imagem === 'Capa');
    this.indiceGaleria = capaIx >= 0 ? capaIx : 0;
  }

  selecionarMiniatura(indice: number): void {
    if (indice >= 0 && indice < this.imagensGaleria.length) {
      this.indiceGaleria = indice;
    }
  }

  urlDestaqueGaleria(): string {
    if (!this.imagensGaleria.length) {
      return this.getImagemUrl();
    }
    const raw = this.imagensGaleria[this.indiceGaleria]?.url_imagem;
    const abs = resolverUrlMidiaApi(raw);
    return abs || this.getImagemUrl();
  }

  rotuloTipoImagem(tipo: string | null | undefined): string {
    return rotuloTipoImagemLegivel(tipo);
  }

  rotuloDestaqueGaleria(): string {
    return rotuloTipoImagemLegivel(this.imagensGaleria[this.indiceGaleria]?.tipo_imagem);
  }

  urlMiniatura(img: LivroImagem): string {
    return resolverUrlMidiaApi(img.url_imagem) || this.getImagemUrl();
  }

  adicionarAoCarrinho(): void {
    const validationError = this.validateLivroForCart();
    if (validationError) {
      this.showErrorMessage(validationError);
      return;
    }

    const cartItem = this.createCartItem();
    const idEstoque = this.getEstoqueId();

    this.carrinhoService.adicionarItem(idEstoque, cartItem).subscribe({
      next: () => this.showCartSuccessMessage(),
      error: (err) => {
        console.error('Erro ao adicionar item:', err);
        const errorMsg = err?.error?.message || 'Erro ao adicionar ao carrinho. Tente novamente.';
        this.showErrorMessage(errorMsg);
      }
    });
  }

  private validateLivroForCart(): string | null {
    if (!this.livro) {
      return '❌ Erro: livro não encontrado';
    }

    if (!this.podeAdicionarAoCarrinho()) {
      return '❌ Este livro não está disponível para compra';
    }

    return null;
  }

  private createCartItem(): any {
    const e = this.getEstoqueSelecionado();
    const precoNum = this.getPrecoSelecionadoNumero() ?? 0;

    return {
      livroId: String(this.livro.id_livro || this.livro.id),
      titulo: this.livro.titulo || 'Livro sem título',
      autor: this.getAutorNome(),
      preco: precoNum,
      imagemUrl: this.getImagemUrl(),
      estoqueId: e?.id_estoque != null ? Number(e.id_estoque) : undefined
    };
  }

  private getEstoqueId(): number {
    const id = this.idEstoqueSelecionado ?? this.getEstoqueSelecionado()?.id_estoque;
    return Number(id);
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