import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicacaoService } from '../../services/publicacao.service';
import { AuthService } from '../../services/auth';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-publicacao-detalhes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './publicacao-detalhes.html',
  styleUrls: ['./publicacao-detalhes.scss']
})
export class PublicacaoDetalhes implements OnInit {

  post: any = null;
  comentarioForm!: FormGroup;
  postId: string = '';
  enviandoComentario: boolean = false;
  pendingComentarios: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private publicacaoService: PublicacaoService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.comentarioForm = this.fb.group({
      conteudo: ['', Validators.required]
    });

    this.route.paramMap.pipe(
      switchMap(params => {
        this.postId = params.get('id') || '';
        if (this.postId) {
          return this.publicacaoService.getPublicacaoById(this.postId);
        }
        return [];
      })
    ).subscribe({
      next: (data: any) => {
        this.post = data;
        if (this.post?.comentarios && Array.isArray(this.post.comentarios)) {
          this.post.comentarios = this.post.comentarios.map((c: any) => ({
            ...c,
            likes: c.likes ?? c.likesCount ?? 0,
            dislikes: c.dislikes ?? 0,
            userReaction: c.userReaction ?? (c.userLiked ? 'LIKE' : null),
            _reactionLoading: false
          }));
        }
      },
      error: (err: any) => console.error('Erro ao carregar post', err)
    });
    this.loadPendingFromStorage();
  }

  onComentarioSubmit(): void {
    if (this.comentarioForm.valid) {
      try {
        const stored = localStorage.getItem('pendingComentarios');
        if (stored) {
          const list = JSON.parse(stored) as any[];
          const dup = list.find(i => String(i.postId) === String(this.postId) && (i.conteudo || '') === (this.comentarioForm.value.conteudo || ''));
          if (dup) {
            alert('Você já enviou este comentário e ele ainda está pendente de aprovação.');
            return;
          }
        }
      } catch (e) { /* ignore parse errors */ }

      this.enviandoComentario = true;
      this.publicacaoService.criarComentario(this.postId, this.comentarioForm.value).subscribe({
        next: (response: any) => {
          const currentUser = this.authService.getUser();
          const autor = currentUser ? { nome: currentUser.nome || currentUser.name } : (response.autor || null);
          const pending = { ...response, postId: this.postId, _pendente: true, autor, data_comentario: response.data || new Date().toISOString(), likesCount: response.likesCount ?? 0, userLiked: !!response.userLiked };
          this.pendingComentarios.unshift(pending);
          this.savePendingToStorage(pending);
          this.comentarioForm.reset();
          this.enviandoComentario = false;
          alert('Seu comentário foi enviado e ficará pendente de aprovação.');
        },
        error: (err: any) => {
          console.error('Erro ao adicionar comentário', err);
          this.enviandoComentario = false;
          if (err.status === 401) {
            alert('Você precisa estar logado para comentar.');
          } else {
            alert('Erro ao enviar comentário. Tente novamente.');
          }
        }
      });
    }
  }

  private loadPendingFromStorage() {
    try {
      const raw = localStorage.getItem('pendingComentarios');
      if (raw) {
        const all = JSON.parse(raw) as any[];
        this.pendingComentarios = all.filter(c => String(c.postId) === String(this.postId));
      }
    } catch (e) {
      console.error('Erro lendo pendingComentarios do localStorage', e);
      this.pendingComentarios = [];
    }
  }

  private savePendingToStorage(item: any) {
    try {
      const raw = localStorage.getItem('pendingComentarios');
      const all = raw ? (JSON.parse(raw) as any[]) : [];
      all.unshift(item);
      localStorage.setItem('pendingComentarios', JSON.stringify(all.slice(0, 50)));
    } catch (e) {
      console.error('Erro salvando pendingComentarios no localStorage', e);
    }
  }

  // Toggle reaction (LIKE or DISLIKE) on a comment with optimistic UI and debounce
  toggleReaction(comentario: any, type: 'LIKE' | 'DISLIKE') {
    comentario.likes = comentario.likes ?? comentario.likesCount ?? 0;
    comentario.dislikes = comentario.dislikes ?? 0;
    comentario.userReaction = comentario.userReaction ?? (comentario.userLiked ? 'LIKE' : null);

    if (comentario._reactionLoading) return;
    comentario._reactionLoading = true;

    const prev = { likes: comentario.likes, dislikes: comentario.dislikes, userReaction: comentario.userReaction };

    // optimistic update
    if (prev.userReaction === type) {
      // toggle off
      if (type === 'LIKE') comentario.likes = Math.max(0, comentario.likes - 1);
      else comentario.dislikes = Math.max(0, comentario.dislikes - 1);
      comentario.userReaction = null;
    } else if (!prev.userReaction) {
      // new reaction
      if (type === 'LIKE') comentario.likes = comentario.likes + 1;
      else comentario.dislikes = comentario.dislikes + 1;
      comentario.userReaction = type;
    } else {
      // switch
      if (type === 'LIKE') { comentario.likes = comentario.likes + 1; comentario.dislikes = Math.max(0, comentario.dislikes - 1); }
      else { comentario.dislikes = comentario.dislikes + 1; comentario.likes = Math.max(0, comentario.likes - 1); }
      comentario.userReaction = type;
    }

    const id = comentario.id_comentario || comentario.id;
    if (!id) {
      // local pending comment — only local toggle
      comentario._reactionLoading = false;
      return;
    }

    this.publicacaoService.postReaction(String(id), type).subscribe({
      next: (res: any) => {
        comentario.likes = res?.likes ?? comentario.likes;
        comentario.dislikes = res?.dislikes ?? comentario.dislikes;
        comentario.userReaction = res?.userReaction ?? comentario.userReaction;
        comentario._reactionLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao reagir ao comentário', err);
        // rollback
        comentario.likes = prev.likes;
        comentario.dislikes = prev.dislikes;
        comentario.userReaction = prev.userReaction;
        comentario._reactionLoading = false;
        if (err.status === 401) {
          alert('Você precisa estar logado para reagir a comentários.');
        } else {
          alert('Erro ao processar reação. Tente novamente.');
        }
      }
    });
  }
}