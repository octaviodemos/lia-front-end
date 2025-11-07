import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivroService } from '../../../services/livro.service';

@Component({
  selector: 'app-admin-livros',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-livros.html',
  styleUrls: ['./admin-livros.scss']
})
export class AdminLivros implements OnInit {

  livroForm!: FormGroup;
  mensagemSucesso: string = '';

  constructor(
    private fb: FormBuilder,
    private livroService: LivroService
  ) {}

  ngOnInit(): void {
    this.livroForm = this.fb.group({
      titulo: ['', Validators.required],
      sinopse: [''],
      editora: [''],
      ano_publicacao: [null],
      isbn: [''],
      capa_url: ['']
    });
  }

  onSubmit(): void {
    if (this.livroForm.valid) {
      this.livroService.criarLivro(this.livroForm.value).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = `Livro "${response.titulo}" criado com sucesso!`;
          this.livroForm.reset();
        },
        error: (err: any) => {
          console.error('Erro ao criar livro:', err);
          this.mensagemSucesso = 'Erro ao criar livro.';
        }
      });
    }
  }
}