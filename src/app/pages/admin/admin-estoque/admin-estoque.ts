import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivroService } from '../../../services/livro.service';
import { EstoqueService } from '../../../services/estoque.service';

@Component({
  selector: 'app-admin-estoque',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-estoque.html',
  styleUrls: ['./admin-estoque.scss']
})
export class AdminEstoque implements OnInit {

  estoqueForm!: FormGroup;
  livrosDoCatalogo: any[] = [];
  mensagemSucesso: string = '';

  constructor(
    private fb: FormBuilder,
    private livroService: LivroService,
    private estoqueService: EstoqueService
  ) {}

  ngOnInit(): void {
    this.carregarLivrosDoCatalogo();

    this.estoqueForm = this.fb.group({
      id_livro: [null, Validators.required],
      preco: [null, [Validators.required, Validators.min(0)]],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      condicao: ['Novo', Validators.required]
    });
  }

  carregarLivrosDoCatalogo(): void {
    this.livroService.getLivros().subscribe({
      next: (data: any) => this.livrosDoCatalogo = data,
      error: (err: any) => console.error('Erro ao carregar livros', err)
    });
  }

  onSubmit(): void {
    if (this.estoqueForm.valid) {
      this.estoqueService.adicionarItemEstoque(this.estoqueForm.value).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = 'Item adicionado ao estoque com sucesso!';
          this.estoqueForm.reset({ quantidade: 1, condicao: 'Novo' });
        },
        error: (err: any) => {
          console.error('Erro ao adicionar ao estoque:', err);
          this.mensagemSucesso = 'Erro ao adicionar item.';
        }
      });
    }
  }
}