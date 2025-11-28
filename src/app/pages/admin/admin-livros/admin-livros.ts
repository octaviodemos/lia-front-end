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
    console.log('Form válido?', this.livroForm.valid);
    console.log('Form value:', this.livroForm.value);
    console.log('Form errors:', this.livroForm.errors);
    
    if (this.livroForm.valid) {
      const payload = this.livroForm.value;
      console.log('Payload sendo enviado:', payload);
      console.log('Tipos dos campos:', {
        titulo: typeof payload.titulo,
        sinopse: typeof payload.sinopse,
        editora: typeof payload.editora,
        ano_publicacao: typeof payload.ano_publicacao,
        isbn: typeof payload.isbn,
        capa_url: typeof payload.capa_url
      });
      
      this.livroService.criarLivro(payload).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = `Livro "${response.titulo}" criado com sucesso!`;
          this.livroForm.reset();
        },
        error: (err: any) => {
          console.error('Erro completo:', err);
          console.error('Status:', err.status);
          console.error('Mensagem:', err.error?.message);
          console.error('Detalhes:', err.error);
          
          if (err.status === 500) {
            this.mensagemSucesso = 'Erro interno no servidor. Verifique os logs do backend para mais detalhes.';
          } else if (Array.isArray(err.error?.message)) {
            console.error('Erros de validação:');
            err.error.message.forEach((msg: string, i: number) => {
              console.error(`  ${i + 1}. ${msg}`);
            });
            this.mensagemSucesso = err.error.message.join(', ');
          } else {
            this.mensagemSucesso = err.error?.message || 'Erro ao criar livro.';
          }
        }
      });
    }
  }
}