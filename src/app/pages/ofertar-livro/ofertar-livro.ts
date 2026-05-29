import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OfertaVendaService } from '../../services/oferta-venda.service';
import { AiService } from '../../services/ai.service';
import { LIVRO_IMAGEM_FORM_SLOTS, LivroImagemFormFieldName } from '../../models/livro-imagem';
import type { IdentificacaoCapa } from '../../models/identificacao-capa';
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
  mensagemCapaIa: string = '';
  identificandoCapa = false;
  readonly slotsImagens = LIVRO_IMAGEM_FORM_SLOTS;
  readonly camposFotoObrigatorios: LivroImagemFormFieldName[] = [
    'imagem_Capa',
    'imagem_Contracapa',
    'imagem_Lombada',
    'imagem_MioloPaginas',
  ];
  submitAttempt = false;
  private readonly tamanhoMaxArquivo = 5 * 1024 * 1024;

  arquivosPorTipo: Partial<Record<LivroImagemFormFieldName, File | null>> = {};
  nomesArquivos: Partial<Record<LivroImagemFormFieldName, string>> = {};
  previewsPorTipo: Partial<Record<LivroImagemFormFieldName, string | null>> = {};

  constructor(
    private fb: FormBuilder,
    private ofertaVendaService: OfertaVendaService,
    private aiService: AiService,
  ) {}

  ngOnInit(): void {
    this.ofertaForm = this.fb.group({
      titulo_livro: ['', Validators.required],
      autor_livro: ['', Validators.required],
      descricao_condicao: [''],
      preco_sugerido: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]]
    });
  }

  idInputArquivo(campo: LivroImagemFormFieldName): string {
    return `oferta-arquivo-${campo}`;
  }

  temCapaAnexada(): boolean {
    return !!this.arquivosPorTipo.imagem_Capa;
  }

  fotoObrigatoriaPendente(campo: LivroImagemFormFieldName): boolean {
    return this.camposFotoObrigatorios.includes(campo) && !this.arquivosPorTipo[campo];
  }

  mensagemFotoObrigatoria(campo: LivroImagemFormFieldName): string {
    const mapa: Record<LivroImagemFormFieldName, string> = {
      imagem_Capa: 'A foto da capa é obrigatória.',
      imagem_Contracapa: 'A foto da contracapa é obrigatória.',
      imagem_Lombada: 'A foto da lombada é obrigatória.',
      imagem_MioloPaginas: 'A foto do miolo ou das páginas é obrigatória.',
      imagem_DetalhesAvarias: '',
    };
    return mapa[campo] || '';
  }

  fotosObrigatoriasOk(): boolean {
    return this.camposFotoObrigatorios.every((c) => !!this.arquivosPorTipo[c]);
  }

  podeEnviar(): boolean {
    return this.ofertaForm.valid && this.fotosObrigatoriasOk();
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
          : msg || 'Não foi possível ler a capa agora. Preencha título e autor manualmente.';
      },
    });
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
    this.submitAttempt = true;
    if (!this.podeEnviar()) {
      this.ofertaForm.markAllAsTouched();
      return;
    }
    const formData = new FormData();
    const v = this.ofertaForm.value;
    formData.append('titulo_livro', String(v.titulo_livro).trim());
    formData.append('autor_livro', String(v.autor_livro).trim());
    const condicao = String(v.descricao_condicao ?? '').trim();
    formData.append('condicao_livro', condicao.length > 0 ? condicao : 'Não informado.');
    formData.append('preco_sugerido', this.normalizarPrecoSugerido(v.preco_sugerido));
    anexarImagensLivroNoFormData(formData, this.arquivosPorTipo);
    this.ofertaVendaService.enviarOferta(formData).subscribe({
      next: () => {
        this.mensagemSucesso =
          'Entraremos em contato via WhatsApp ou e-mail cadastrado na sua conta.';
        this.mensagemCapaIa = '';
        this.submitAttempt = false;
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

  private aplicarIdentificacaoCapa(r: IdentificacaoCapa): void {
    const patch: { titulo_livro?: string; autor_livro?: string } = {};
    if (r.titulo?.trim()) {
      patch.titulo_livro = r.titulo.trim();
    }
    if (r.autor?.trim()) {
      patch.autor_livro = r.autor.trim();
    }
    if (Object.keys(patch).length) {
      this.ofertaForm.patchValue(patch);
      this.ofertaForm.get('titulo_livro')?.markAsTouched();
      this.ofertaForm.get('autor_livro')?.markAsTouched();
    }
    const conf = r.confianca === 'alta' ? 'alta' : r.confianca === 'media' ? 'média' : 'baixa';
    if (patch.titulo_livro || patch.autor_livro) {
      this.mensagemCapaIa = `Capa lida pela IA (confiança ${conf}). Revise título e autor antes de enviar.`;
    } else {
      this.mensagemCapaIa = 'A IA não conseguiu ler título ou autor na capa. Preencha manualmente ou tente outra foto.';
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
