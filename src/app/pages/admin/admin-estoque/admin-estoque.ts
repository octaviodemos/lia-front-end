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
  itensLista: any[] = [];
  mensagemSucesso: string = '';

  constructor(
    private fb: FormBuilder,
    private livroService: LivroService,
    private estoqueService: EstoqueService
  ) {}

  ngOnInit(): void {
    this.carregarLivrosDoCatalogo();
    this.carregarListaEstoque();

    this.estoqueForm = this.fb.group({
      id_livro: [null, Validators.required],
      preco: [null, [Validators.required, Validators.min(0)]],
      condicao: ['novo', Validators.required]
    });
  }

  carregarLivrosDoCatalogo(): void {
    this.livroService.getLivros().subscribe({
      next: (data: any) => this.livrosDoCatalogo = data,
      error: (err: any) => console.error('Erro ao carregar livros', err)
    });
  }

  carregarListaEstoque(): void {
    this.estoqueService.listarEstoque().subscribe({
      next: (res: any) => {
        const arr = Array.isArray(res) ? res : (res?.data ?? res?.items ?? res?.estoques ?? []);
        this.itensLista = Array.isArray(arr) ? arr : [];
      },
      error: () => {
        this.itensLista = [];
      }
    });
  }

  onSubmit(): void {
    if (this.estoqueForm.valid) {
      const formValue = this.estoqueForm.value;
      const payload = {
        id_livro: formValue.id_livro,
        preco: parseFloat(formValue.preco).toFixed(2),
        condicao: formValue.condicao,
        disponivel: true
      };
      
      this.estoqueService.adicionarItemEstoque(payload).subscribe({
        next: () => {
          this.mensagemSucesso = 'Item adicionado ao estoque com sucesso!';
          this.estoqueForm.reset({ id_livro: null, preco: null, condicao: 'novo' });
          this.carregarListaEstoque();
        },
        error: (err: any) => {
          console.error('Erro:', err);
          if (Array.isArray(err.error?.message)) {
            this.mensagemSucesso = err.error.message.join(', ');
          } else {
            this.mensagemSucesso = err.error?.message || 'Erro ao adicionar item.';
          }
        }
      });
    }
  }

  tituloLivroNaLista(item: any): string {
    return item?.livro?.titulo || item?.titulo_livro || item?.livro_titulo || `Livro #${item?.id_livro ?? '—'}`;
  }

  itemDisponivel(item: any): boolean {
    const v = item?.disponivel;
    return v === true || v === 'true' || v === 1 || v === '1';
  }
}
