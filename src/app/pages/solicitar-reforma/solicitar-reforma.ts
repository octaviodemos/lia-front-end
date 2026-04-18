import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReformaService } from '../../services/reforma.service';
import { LIVRO_IMAGEM_FORM_SLOTS, LivroImagemFormFieldName } from '../../models/livro-imagem';
import { anexarImagensLivroNoFormData, mensagemErroArquivoImagem } from '../../utils/livro-imagem-helpers';

@Component({
  selector: 'app-solicitar-reforma',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './solicitar-reforma.html',
  styleUrls: ['./solicitar-reforma.scss']
})
export class SolicitarReforma implements OnInit {

  reformaForm!: FormGroup;
  mensagemSucesso: string = '';
  readonly slotsImagens = LIVRO_IMAGEM_FORM_SLOTS;
  private readonly tamanhoMaxArquivo = 5 * 1024 * 1024;

  arquivosPorTipo: Partial<Record<LivroImagemFormFieldName, File | null>> = {};
  nomesArquivos: Partial<Record<LivroImagemFormFieldName, string>> = {};
  previewsPorTipo: Partial<Record<LivroImagemFormFieldName, string | null>> = {};

  constructor(
    private fb: FormBuilder,
    private reformaService: ReformaService
  ) {}

  ngOnInit(): void {
    this.reformaForm = this.fb.group({
      descricao_problema: ['', Validators.required]
    });
  }

  idInputArquivo(campo: LivroImagemFormFieldName): string {
    return `reforma-arquivo-${campo}`;
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

  private possuiAlgumaImagem(): boolean {
    return this.slotsImagens.some((s) => !!this.arquivosPorTipo[s.formFieldName]);
  }

  onSubmit(): void {
    if (!this.reformaForm.valid) {
      return;
    }
    if (!this.possuiAlgumaImagem()) {
      alert('Por favor, preencha a descrição e anexe pelo menos uma foto.');
      return;
    }
    const formData = new FormData();
    const descricao = String(this.reformaForm.get('descricao_problema')?.value || '');
    formData.append('descricao_problema', descricao);
    anexarImagensLivroNoFormData(formData, this.arquivosPorTipo);

    this.reformaService.criarSolicitacao(formData).subscribe({
      next: () => {
        this.mensagemSucesso = 'Solicitação de reforma enviada com sucesso!';
        this.reformaForm.reset();
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
        console.error('Erro ao enviar solicitação:', err);
        const backendMsg = err?.error?.message || err?.message || 'Erro ao enviar solicitação. Tente novamente.';
        if (Array.isArray(backendMsg)) {
          this.mensagemSucesso = backendMsg.join('; ');
        } else if (typeof backendMsg === 'string') {
          this.mensagemSucesso = backendMsg;
        } else {
          this.mensagemSucesso = 'Erro ao enviar solicitação. Tente novamente.';
        }
      }
    });
  }
}
