import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicacaoService } from '../../services/publicacao.service';
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

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private publicacaoService: PublicacaoService
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
      next: (data: any) => this.post = data,
      error: (err: any) => console.error('Erro ao carregar post', err)
    });
  }

  onComentarioSubmit(): void {
    if (this.comentarioForm.valid) {
      this.publicacaoService.criarComentario(this.postId, this.comentarioForm.value).subscribe({
        next: (response: any) => {
          console.log('Comentário adicionado!', response);
          this.post.comentarios.push(response);
          this.comentarioForm.reset();
        },
        error: (err: any) => console.error('Erro ao adicionar comentário', err)
      });
    }
  }
}