import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AvaliacaoService } from '../../services/avaliacao.service';

const MIN_RATING = 1;
const MAX_RATING = 5;
const MIN_COMMENT_LENGTH = 10;
const SUCCESS_MESSAGE_DURATION = 4000;
const PENDING_STORAGE_KEY = 'pendingAvaliacoes';
const LOCAL_ID_PREFIX = 'local_';

@Component({
  selector: 'app-avaliacao-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './avaliacao-form.html',
  styleUrls: ['./avaliacao-form.scss']
})
export class AvaliacaoForm implements OnInit {
  @Input() idLivro: string = '';
  @Output() avaliacaoSalva = new EventEmitter<any>();
  
  avaliacaoForm!: FormGroup;
  mensagemErro: string = '';
  mensagemSucesso: string = '';
  enviando: boolean = false;

  constructor(
    private fb: FormBuilder,
    private avaliacaoService: AvaliacaoService
  ) {}

  ngOnInit(): void {
    this.createForm();
  }

  private createForm(): void {
    this.avaliacaoForm = this.fb.group({
      nota: [null, [Validators.required, Validators.min(MIN_RATING), Validators.max(MAX_RATING)]],
      comentario: ['', [Validators.required, Validators.minLength(MIN_COMMENT_LENGTH)]]
    });
  }

  onSubmit(): void {
    this.clearMessages();

    const validationError = this.validateForm();
    if (validationError) {
      this.mensagemErro = validationError;
      return;
    }

    if (this.isDuplicateSubmission()) {
      this.mensagemErro = 'Você já enviou uma avaliação igual e ela ainda está pendente de aprovação.';
      return;
    }

    this.submitAvaliacao();
  }

  private clearMessages(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
  }

  private validateForm(): string | null {
    if (!this.idLivro) {
      return 'Erro: ID do livro não encontrado';
    }

    if (this.avaliacaoForm.invalid) {
      return `Por favor, preencha todos os campos corretamente (comentário mínimo de ${MIN_COMMENT_LENGTH} caracteres)`;
    }

    return null;
  }

  private isDuplicateSubmission(): boolean {
    try {
      const pendingItems = this.getPendingFromStorage();
      return this.findDuplicate(pendingItems) !== null;
    } catch (error) {
      return false; // Em caso de erro, permite o envio
    }
  }

  private getPendingFromStorage(): any[] {
    try {
      const stored = localStorage.getItem(PENDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private findDuplicate(pendingItems: any[]): any | null {
    const formValues = this.avaliacaoForm.value;
    
    return pendingItems.find(item => 
      String(item.livroId) === String(this.idLivro) &&
      String(item.nota) === String(formValues.nota) &&
      (item.comentario || '') === (formValues.comentario || '')
    ) || null;
  }

  private submitAvaliacao(): void {
    this.enviando = true;
    const payload = this.createPayload();

    this.avaliacaoService.criarAvaliacao(this.idLivro, payload).subscribe({
      next: (response: any) => this.handleSubmitSuccess(response),
      error: (error: any) => this.handleSubmitError(error, payload)
    });
  }

  private createPayload(): any {
    return {
      ...this.avaliacaoForm.value,
      nota: Number(this.avaliacaoForm.value.nota)
    };
  }

  private handleSubmitSuccess(response: any): void {
    this.mensagemSucesso = 'Sua avaliação foi enviada e ficará pendente de aprovação.';
    this.avaliacaoForm.reset();
    this.avaliacaoSalva.emit(response);
    this.enviando = false;

    this.clearSuccessMessageAfterDelay();
  }

  private handleSubmitError(error: any, payload: any): void {
    const localResponse = this.createLocalResponse(payload);
    this.avaliacaoSalva.emit(localResponse);
    
    this.enviando = false;
    this.mensagemErro = this.getErrorMessage(error);
  }

  private createLocalResponse(payload: any): any {
    return {
      ...payload,
      id_avaliacao: LOCAL_ID_PREFIX + Date.now(),
      aprovado: false,
      data_avaliacao: new Date().toISOString()
    };
  }

  private getErrorMessage(error: any): string {
    if (error.status === 401) {
      return 'Você precisa estar logado para avaliar';
    }
    
    if (error.error?.message) {
      return Array.isArray(error.error.message) 
        ? error.error.message.join(', ')
        : error.error.message;
    }
    
    return 'Erro ao enviar avaliação. Tente novamente.';
  }

  private clearSuccessMessageAfterDelay(): void {
    setTimeout(() => {
      this.mensagemSucesso = '';
    }, SUCCESS_MESSAGE_DURATION);
  }
}