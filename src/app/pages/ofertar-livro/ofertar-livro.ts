import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OfertaVendaService } from '../../services/oferta-venda.service';
import { LIVRO_IMAGEM_FORM_SLOTS, LivroImagemFormFieldName } from '../../models/livro-imagem';
import { anexarImagensLivroNoFormData, mensagemErroArquivoImagem } from '../../utils/livro-imagem-helpers';

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
  readonly slotsImagens = LIVRO_IMAGEM_FORM_SLOTS;
  private readonly tamanhoMaxArquivo = 5 * 1024 * 1024;

  arquivosPorTipo: Partial<Record<LivroImagemFormFieldName, File | null>> = {};
  nomesArquivos: Partial<Record<LivroImagemFormFieldName, string>> = {};
  previewsPorTipo: Partial<Record<LivroImagemFormFieldName, string | null>> = {};

  constructor(
    private fb: FormBuilder,
    private ofertaVendaService: OfertaVendaService
  ) {}

  ngOnInit(): void {
    this.ofertaForm = this.fb.group({
      titulo_livro: ['', Validators.required],
      autor_livro: [''],
      isbn: [''],
      descricao_condicao: [''],
      preco_sugerido: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]]
    });
  }

  idInputArquivo(campo: LivroImagemFormFieldName): string {
    return `oferta-arquivo-${campo}`;
  }

  aoSelecionarArquivo(campo: LivroImagemFormFieldName, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) {
      return;
    }
    const arquivo = input.files[0];
    const erro = mensagemErroArquivoImagem(arquivo, this.tamanhoMaxArquivo);
    if (erro) {
      this.mensagemSucesso = erro;
      input.value = '';
      return;
    }
    this.arquivosPorTipo = { ...this.arquivosPorTipo, [campo]: arquivo };
    this.nomesArquivos = { ...this.nomesArquivos, [campo]: arquivo.name };
    const leitor = new FileReader();
    leitor.onload = (e: ProgressEvent<FileReader>) => {
      this.previewsPorTipo = { ...this.previewsPorTipo, [campo]: String(e.target?.result ?? '') };
    };
    leitor.readAsDataURL(arquivo);
  }

  limparArquivo(campo: LivroImagemFormFieldName): void {
    const proximoArquivos = { ...this.arquivosPorTipo };
    delete proximoArquivos[campo];
    this.arquivosPorTipo = proximoArquivos;
    const proximoNomes = { ...this.nomesArquivos };
    delete proximoNomes[campo];
    this.nomesArquivos = proximoNomes;
    const proximoPreviews = { ...this.previewsPorTipo };
    delete proximoPreviews[campo];
    this.previewsPorTipo = proximoPreviews;
    const el = document.getElementById(this.idInputArquivo(campo)) as HTMLInputElement | null;
    if (el) {
      el.value = '';
    }
  }

  onSubmit(): void {
    if (this.ofertaForm.valid) {
      const formData = new FormData();
      const v = this.ofertaForm.value;
      if (v.titulo_livro != null && v.titulo_livro !== '') {
        formData.append('titulo_livro', String(v.titulo_livro));
      }
      if (v.autor_livro != null && v.autor_livro !== '') {
        formData.append('autor_livro', String(v.autor_livro));
      }
      if (v.isbn != null && v.isbn !== '') {
        formData.append('isbn', String(v.isbn));
      }
      if (v.descricao_condicao != null && v.descricao_condicao !== '') {
        formData.append('descricao_condicao', String(v.descricao_condicao));
      }
      formData.append('preco_sugerido', this.normalizarPrecoSugerido(v.preco_sugerido));
      anexarImagensLivroNoFormData(formData, this.arquivosPorTipo);
      this.ofertaVendaService.enviarOferta(formData).subscribe({
        next: () => {
          this.mensagemSucesso =
            'Entraremos em contato via WhatsApp ou e-mail cadastrado na sua conta.';
          this.ofertaForm.reset();
          this.arquivosPorTipo = {};
          this.nomesArquivos = {};
          this.previewsPorTipo = {};
          this.slotsImagens.forEach((s) => {
            const el = document.getElementById(this.idInputArquivo(s.formFieldName)) as HTMLInputElement | null;
            if (el) {
              el.value = '';
            }
          });
        },
        error: (err: any) => {
          console.error('Erro ao enviar oferta:', err);
          this.mensagemSucesso = 'Erro ao enviar oferta. Tente novamente.';
        }
      });
    }
  }

  private normalizarPrecoSugerido(valor: unknown): string {
    const texto = String(valor ?? '').trim().replace(',', '.');
    const numero = Number(texto);
    if (!Number.isFinite(numero) || numero < 0) {
      return '0.00';
    }
    return numero.toFixed(2);
  }
}
