import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PublicacaoService } from '../../services/publicacao.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-comunidade',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], 
  templateUrl: './comunidade.html',
  styleUrls: ['./comunidade.scss']
})
export class Comunidade implements OnInit {

  publicacoes: any[] = [];
  postForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private publicacaoService: PublicacaoService
  ) {}

  ngOnInit(): void {
    this.postForm = this.fb.group({
      titulo: ['', Validators.required],
      conteudo: ['', Validators.required]
    });

    this.carregarPublicacoes();
  }

  carregarPublicacoes(): void {
    this.publicacaoService.getPublicacoes().subscribe({
      next: (data: any) => {
        this.publicacoes = data;
      },
      error: (err: any) => console.error('Erro ao carregar publicações', err)
    });
  }

  onSubmit(): void {
    if (this.postForm.valid) {
      this.publicacaoService.criarPublicacao(this.postForm.value).subscribe({
        next: (response: any) => {
          console.log('Publicação criada!', response);
          this.postForm.reset();
          this.carregarPublicacoes();
        },
        error: (err: any) => {
          console.error('Erro ao criar publicação', err);
        }
      });
    }
  }
}