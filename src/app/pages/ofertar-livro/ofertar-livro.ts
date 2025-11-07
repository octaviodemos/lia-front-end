import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OfertaVendaService } from '../../services/oferta-venda.service';

@Component({
  selector: 'app-ofertar-livro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ofertar-livro.html',
  styleUrls: ['./ofertar-livro.scss']
})
export class OfertarLivro implements OnInit {

  ofertaForm!: FormGroup;
  mensagemSucesso: string = '';

  constructor(
    private fb: FormBuilder,
    private ofertaVendaService: OfertaVendaService
  ) {}

  ngOnInit(): void {
    this.ofertaForm = this.fb.group({
      titulo_livro: ['', Validators.required],
      autor_livro: [''],
      isbn: [''],
      condicao_livro: ['', Validators.required],
      preco_sugerido: ['', [Validators.required, Validators.min(0)]]
    });
  }

  onSubmit(): void {
    if (this.ofertaForm.valid) {
      this.ofertaVendaService.criarOferta(this.ofertaForm.value).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = 'Oferta enviada com sucesso! A LIA entrará em contato em breve.';
          this.ofertaForm.reset();
        },
        error: (err: any) => {
          console.error('Erro ao enviar oferta:', err);
          this.mensagemSucesso = 'Erro ao enviar oferta. Tente novamente.';
        }
      });
    }
  }
}