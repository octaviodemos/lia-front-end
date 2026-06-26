import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivroService } from '../../../services/livro.service';
import { AiService } from '../../../services/ai.service';
import { LIVRO_IMAGEM_FORM_SLOTS, LivroImagemFormFieldName } from '../../../models/livro-imagem';
import type { IdentificacaoCapa } from '../../../models/identificacao-capa';
import { anexarImagensLivroNoFormData, mensagemErroArquivoImagem } from '../../../utils/livro-imagem-helpers';

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
  mensagemCapaIa: string = '';
  identificandoCapa = false;
  readonly slotsImagens = LIVRO_IMAGEM_FORM_SLOTS;
  private readonly tamanhoMaxArquivo = 5 * 1024 * 1024;

  arquivosPorTipo: Partial<Record<LivroImagemFormFieldName, File | null>> = {};
  nomesArquivos: Partial<Record<LivroImagemFormFieldName, string>> = {};
  previewsPorTipo: Partial<Record<LivroImagemFormFieldName, string | null>> = {};

  constructor(
    private fb: FormBuilder,
    private livroService: LivroService,
    private aiService: AiService,
  ) {}

  ngOnInit(): void {
    this.livroForm = this.fb.group({
      titulo: ['', Validators.required],
      autor: [''],
      sinopse: [''],
      editora: [''],
      ano_publicacao: [null],
      isbn: [''],
      nota_conservacao: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      descricao_conservacao: [''],
      destaque_vitrine: [false],
      preco: [null as number | null, [Validators.min(0)]]
    });
  }

  idInputArquivo(campo: LivroImagemFormFieldName): string {
    return `arquivo-${campo}`;
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
    if (campo === 'imagem_Capa') {
      this.identificarCapaComIa(arquivo);
    }
  }

  identificarCapaComIa(arquivo?: File | null): void {
    const capa = arquivo ?? this.arquivosPorTipo.imagem_Capa;
    if (!capa || this.identificandoCapa) {
      return;
    }
    this.mensagemCapaIa = '';
    this.identificandoCapa = true;
    this.aiService.identificarCapa(capa).subscribe({
      next: (r) => {
        this.identificandoCapa = false;
        this.aplicarIdentificacaoCapa(r);
      },
      error: (err) => {
        this.identificandoCapa = false;
        const msg = err?.error?.message;
        this.mensagemCapaIa = Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Não foi possível ler a capa agora. Preencha título e ISBN manualmente.';
      },
    });
  }

  private aplicarIdentificacaoCapa(r: IdentificacaoCapa): void {
    const patch: {
      titulo?: string;
      autor?: string;
      isbn?: string;
      editora?: string;
      ano_publicacao?: number | null;
      sinopse?: string;
    } = {};

    if (r.titulo?.trim()) {
      patch.titulo = r.titulo.trim();
    }
    if (r.autor?.trim()) {
      patch.autor = r.autor.trim();
    }
    if (r.isbn?.trim()) {
      patch.isbn = r.isbn.trim();
    }
    if (r.editora?.trim()) {
      patch.editora = r.editora.trim();
    }
    if (r.ano_publicacao != null) {
      patch.ano_publicacao = r.ano_publicacao;
    }
    if (r.sinopse?.trim()) {
      patch.sinopse = r.sinopse.trim();
    }

    if (Object.keys(patch).length) {
      this.livroForm.patchValue(patch);
      this.livroForm.get('titulo')?.markAsTouched();
      if (patch.autor) {
        this.livroForm.get('autor')?.markAsTouched();
      }
      if (patch.isbn) {
        this.livroForm.get('isbn')?.markAsTouched();
      }
    }

    const conf = r.confianca === 'alta' ? 'alta' : r.confianca === 'media' ? 'média' : 'baixa';
    if (Object.keys(patch).length) {
      this.mensagemCapaIa = `Capa lida pela IA (confiança ${conf}). Campos preenchidos automaticamente — revise título, autor, ISBN e demais dados antes de cadastrar.`;
    } else {
      this.mensagemCapaIa = 'A IA não conseguiu ler dados na capa. Preencha manualmente ou tente outra foto.';
    }
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
    if (campo === 'imagem_Capa') {
      this.mensagemCapaIa = '';
    }
    const el = document.getElementById(this.idInputArquivo(campo)) as HTMLInputElement | null;
    if (el) {
      el.value = '';
    }
  }

  onSubmit(): void {
    if (this.livroForm.valid) {
      const formData = new FormData();
      Object.keys(this.livroForm.value).forEach((key) => {
        const value = this.livroForm.value[key];
        if (value === null || value === undefined || value === '') {
          return;
        }
        if (key === 'descricao_conservacao') {
          if (typeof value !== 'string') {
            return;
          }
          const cortado = value.trim();
          if (!cortado) {
            return;
          }
          formData.append(key, cortado);
          return;
        }
        if (key === 'preco') {
          if (value == null || value === '') {
            return;
          }
          const s = String(value).replace(',', '.');
          const n = parseFloat(s);
          if (!Number.isFinite(n) || n < 0) {
            return;
          }
          formData.append('preco', n.toFixed(2));
          return;
        }
        const payload =
          typeof value === 'number' || typeof value === 'boolean' ? String(value) : value;
        formData.append(key, payload as string | Blob);
      });
      anexarImagensLivroNoFormData(formData, this.arquivosPorTipo);
      this.livroService.criarLivro(formData).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = `Livro "${response.titulo}" criado com sucesso!`;
          this.livroForm.reset({
            titulo: '',
            autor: '',
            sinopse: '',
            editora: '',
            ano_publicacao: null,
            isbn: '',
            nota_conservacao: 5,
            descricao_conservacao: '',
            destaque_vitrine: false,
            preco: null,
          });
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
          if (err.status === 500) {
            this.mensagemSucesso = 'Erro interno no servidor. Verifique os logs do backend para mais detalhes.';
          } else if (Array.isArray(err.error?.message)) {
            this.mensagemSucesso = err.error.message.join(', ');
          } else {
            this.mensagemSucesso = err.error?.message || 'Erro ao criar livro.';
          }
        }
      });
    }
  }
}
