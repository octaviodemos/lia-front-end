import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LivroService } from '../../services/livro.service';
import { CarrinhoService } from '../../services/carrinho.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { AuthService } from '../../services/auth';
import { switchMap } from 'rxjs';
import { getGeneroLabel as getGeneroLabelFn, getImagemUrl as getImagemUrlFn, getAutorNome as getAutorNomeFn, temPreco as temPrecoFn } from '../../utils/livro-utils';
import { AvaliacaoForm } from '../../components/avaliacao-form/avaliacao-form';

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
          this.carregarAvaliacoes();
          return this.livroService.getLivroById(this.livroId);
        }
        return [];
      })
    ).subscribe({
      next: (data: any) => this.livro = data,
      error: (err: any) => console.error('Erro ao carregar o livro:', err)
    });
    this.loadPendingFromStorage();
  }

  carregarAvaliacoes(): void {
    this.avaliacaoService.getAvaliacoesPorLivro(this.livroId).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.data || data || []);
        this.avaliacoes = list.map((a: any) => {
          const autorFromPayload = a.autor || a.user || a.usuario || a.autor_usuario || null;
          const nomeFromFields = a.autor_nome || a.user_name || a.nome || a.name || null;
          const autor = autorFromPayload
            ? (typeof autorFromPayload === 'string' ? { nome: autorFromPayload } : autorFromPayload)
            : (nomeFromFields ? { nome: nomeFromFields } : null);

          return {
            ...a,
            autor,
            likes: a.likes ?? a.likesCount ?? 0,
            dislikes: a.dislikes ?? 0,
            userReaction: a.userReaction ?? (a.userLiked ? 'LIKE' : null),
            _reactionLoading: false
          };
        });
        this.reconcilePendingWithApproved();
      },
      error: (err: any) => console.error('Erro ao carregar avaliações:', err)
    });
  }

  /**
   * Remove de `pendingAvaliacoes` (e do localStorage) itens que já aparecem
   * entre `avaliacoes` (ou seja: foram aprovados no backend). A comparação
   * usa `comentario` e `nota` como heurística — suficiente para evitar duplicatas
   * causadas pelo usuário que aprovou sua própria submissão.
   */
  private reconcilePendingWithApproved() {
    try {
      const raw = localStorage.getItem('pendingAvaliacoes');
      if (!raw) return;
      const all = JSON.parse(raw) as any[];
      const filtered = all.filter(p => {
        if (String(p.livroId) !== String(this.livroId)) return true;
        const comentario = (p.comentario || '').trim();
        const nota = Number(p.nota || p.nota === 0 ? p.nota : null);
        const match = this.avaliacoes.find(a => {
          const aTexto = (a.comentario || '').trim();
          const aNota = Number(a.nota || a.nota === 0 ? a.nota : null);
          return aTexto && comentario && aTexto === comentario && aNota === nota;
        });
        return !match; 
      });
      localStorage.setItem('pendingAvaliacoes', JSON.stringify(filtered.slice(0, 50)));
      this.pendingAvaliacoes = filtered.filter(p => String(p.livroId) === String(this.livroId));
      const pendentesDoLivro = filtered.filter(p => String(p.livroId) === String(this.livroId));
      pendentesDoLivro.forEach(p => {
        const id = p.id_avaliacao || p.id;
        if (!id) return; 
        this.avaliacaoService.getAvaliacaoById(String(id)).subscribe({
          next: () => {
          },
          error: (err: any) => {
            if (err && err.status === 404) {
              try {
                const raw2 = localStorage.getItem('pendingAvaliacoes');
                const all2 = raw2 ? (JSON.parse(raw2) as any[]) : [];
                const newAll = all2.filter(x => !(String(x.livroId) === String(this.livroId) && String(x.id_avaliacao || x.id || '') === String(id)));
                localStorage.setItem('pendingAvaliacoes', JSON.stringify(newAll.slice(0, 50)));
                this.pendingAvaliacoes = newAll.filter(x => String(x.livroId) === String(this.livroId));
              } catch (e) {
                console.error('Erro atualizando pendingAvaliacoes após 404', e);
              }
            }
          }
        });
      });
    } catch (e) {
      console.error('Erro reconciliando pendingAvaliacoes com avaliacoes aprovadas', e);
    }
  }

  onNovaAvaliacao(novaAvaliacao: any): void {
    const aprovado = novaAvaliacao?.aprovado === true || novaAvaliacao?.aprovado === 'true';
    if (aprovado) {
      this.avaliacoes.unshift(novaAvaliacao);
    } else {
      const currentUser = this.authService.getUser();
      const autor = currentUser ? { nome: currentUser.nome || currentUser.name } : (novaAvaliacao.autor || null);
      const pending = { ...novaAvaliacao, livroId: this.livroId, _pendente: true, autor, data_avaliacao: novaAvaliacao.data_avaliacao || new Date().toISOString(), likesCount: novaAvaliacao.likesCount ?? 0, userLiked: !!novaAvaliacao.userLiked };
      this.pendingAvaliacoes.unshift(pending);
      this.savePendingToStorage(pending);
      this.mensagemSucesso = 'Sua avaliação foi enviada e ficará pendente de aprovação.';
      setTimeout(() => this.mensagemSucesso = '', 4000);
    }
  }

  private loadPendingFromStorage() {
    try {
      const raw = localStorage.getItem('pendingAvaliacoes');
      if (raw) {
        const all = JSON.parse(raw) as any[];
        this.pendingAvaliacoes = all.filter(a => String(a.livroId) === String(this.livroId));
      }
    } catch (e) {
      console.error('Erro lendo pendingAvaliacoes do localStorage', e);
      this.pendingAvaliacoes = [];
    }
  }

  private savePendingToStorage(item: any) {
    try {
      const raw = localStorage.getItem('pendingAvaliacoes');
      const all = raw ? (JSON.parse(raw) as any[]) : [];
      all.unshift(item);
      // keep only recent 50 to avoid excess
      localStorage.setItem('pendingAvaliacoes', JSON.stringify(all.slice(0, 50)));
    } catch (e) {
      console.error('Erro salvando pendingAvaliacoes no localStorage', e);
    }
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
        console.error('Erro ao reagir à avaliação', err);
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

  confirmDeleteAvaliacao(avaliacao: any) {
    const nome = avaliacao.autor?.nome || 'esta avaliação';
    const ok = window.confirm(`Tem certeza que deseja excluir a avaliação de ${nome}? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    this.deleteAvaliacao(avaliacao);
  }

  deleteAvaliacao(avaliacao: any) {
    const id = avaliacao.id_avaliacao || avaliacao.id;
    if (!id) {
      this.avaliacoes = this.avaliacoes.filter(a => a !== avaliacao);
      this.pendingAvaliacoes = this.pendingAvaliacoes.filter(p => p !== avaliacao);
      try {
        const raw = localStorage.getItem('pendingAvaliacoes');
        const all = raw ? (JSON.parse(raw) as any[]) : [];
        const newAll = all.filter(x => x !== avaliacao && String(x.livroId) === String(this.livroId) ? true : true);
        localStorage.setItem('pendingAvaliacoes', JSON.stringify(newAll.slice(0,50)));
      } catch {}
      return;
    }

    avaliacao._deleting = true;
    this.avaliacaoService.deleteAdminAvaliacao(String(id)).subscribe({
      next: () => {
        this.avaliacoes = this.avaliacoes.filter(a => String(a.id_avaliacao || a.id) !== String(id));
        try {
          const raw = localStorage.getItem('pendingAvaliacoes');
          const all = raw ? (JSON.parse(raw) as any[]) : [];
          const newAll = all.filter(x => String(x.id_avaliacao || x.id || '') !== String(id));
          localStorage.setItem('pendingAvaliacoes', JSON.stringify(newAll.slice(0,50)));
          this.pendingAvaliacoes = newAll.filter(p => String(p.livroId) === String(this.livroId));
        } catch (e) {
          console.error('Erro atualizando pendingAvaliacoes após delete', e);
        }
        this.mensagemSucesso = 'Avaliação removida com sucesso.';
        setTimeout(() => this.mensagemSucesso = '', 3000);
      },
      error: (err: any) => {
        console.error('Erro ao excluir avaliação', err);
        avaliacao._deleting = false;
        if (err.status === 401) alert('Você precisa estar logado como admin para excluir avaliações.');
        else alert('Erro ao excluir avaliação. Tente novamente.');
      }
    });
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
    if (!this.livro) {
      this.mensagemSucesso = '❌ Erro: livro não encontrado';
      setTimeout(() => {
        this.mensagemSucesso = '';
      }, 3000);
      return;
    }

    if (!this.temPreco()) {
      this.mensagemSucesso = '❌ Este livro não está disponível para compra';
      setTimeout(() => {
        this.mensagemSucesso = '';
      }, 3000);
      return;
    }

    const preco = this.livro.estoque.preco;
    const precoNum = typeof preco === 'string' ? parseFloat(preco) : preco;
    const idEstoque = Number(this.livro.estoque?.id_estoque || this.livro.id_livro);

    this.carrinhoService.adicionarItem(idEstoque, 1, {
      livroId: String(this.livro.id_livro || this.livro.id),
      titulo: this.livro.titulo || 'Livro sem título',
      autor: this.getAutorNome(),
      preco: precoNum,
      quantidade: 1,
      imagemUrl: this.livro.capa_url
    }).subscribe({
      next: () => {
        this.mensagemSucesso = '✅ Livro adicionado ao carrinho com sucesso!';
        setTimeout(() => {
          this.mensagemSucesso = '';
        }, 3000);
      },
      error: () => {
        this.mensagemSucesso = '✅ Livro adicionado ao carrinho com sucesso!';
        setTimeout(() => {
          this.mensagemSucesso = '';
        }, 3000);
      }
    });
  }
}