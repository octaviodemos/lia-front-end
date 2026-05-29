import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { finalize } from 'rxjs/operators';
import { AvaliacaoService } from '../../services/avaliacao.service';

const MIN_RATING = 1;
const MAX_RATING = 5;
const MIN_COMMENT_LENGTH = 10;
const SUCCESS_MESSAGE_DURATION = 4000;

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
  toastAnaliseIa = false;

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

  private submitAvaliacao(): void {
    this.enviando = true;
    this.toastAnaliseIa = true;
    const payload = this.createPayload();

    this.avaliacaoService
      .criarAvaliacao(this.idLivro, payload)
      .pipe(
        finalize(() => {
          this.toastAnaliseIa = false;
          this.enviando = false;
        }),
      )
      .subscribe({
        next: (response: any) => this.handleSubmitSuccess(response),
        error: (error: any) => this.handleSubmitError(error),
      });
  }

  private createPayload(): any {
    return {
      ...this.avaliacaoForm.value,
      nota: Number(this.avaliacaoForm.value.nota)
    };
  }

  private handleSubmitSuccess(response: any): void {
    this.mensagemSucesso = 'Sua avaliação foi publicada.';
    this.avaliacaoForm.reset();
    this.avaliacaoSalva.emit(response);
    this.clearSuccessMessageAfterDelay();
  }

  private handleSubmitError(error: any): void {
    this.mensagemErro = this.getErrorMessage(error);
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
