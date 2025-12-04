import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AvaliacaoService } from '../../services/avaliacao.service';

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
    this.avaliacaoForm = this.fb.group({
      nota: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comentario: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    if (!this.idLivro) {
      this.mensagemErro = 'Erro: ID do livro não encontrado';
      return;
    }

    if (this.avaliacaoForm.invalid) {
      this.mensagemErro = 'Por favor, preencha todos os campos corretamente (comentário mínimo de 10 caracteres)';
      return;
    }

    // Prevenir envios duplicados: verificar no localStorage se existem avaliações pendentes com o mesmo conteúdo.
    try {
      const stored = localStorage.getItem('pendingAvaliacoes');
      if (stored) {
        const list = JSON.parse(stored) as any[];
        const dup = list.find(i => String(i.livroId) === String(this.idLivro) && String(i.nota) === String(this.avaliacaoForm.value.nota) && (i.comentario || '') === (this.avaliacaoForm.value.comentario || ''));
        if (dup) {
          this.mensagemErro = 'Você já enviou uma avaliação igual e ela ainda está pendente de aprovação.';
          return;
        }
      }
    } catch (e) {
      // ignore parse errors and continue
    }

    this.enviando = true;
    const payload = {
      ...this.avaliacaoForm.value,
      nota: Number(this.avaliacaoForm.value.nota)
    };


    this.avaliacaoService.criarAvaliacao(this.idLivro, payload).subscribe({
      next: (response: any) => {
        this.mensagemSucesso = 'Sua avaliação foi enviada e ficará pendente de aprovação.';
        this.avaliacaoForm.reset();
        // Emitimos para o pai para que ele possa decidir se mostra imediatamente
        this.avaliacaoSalva.emit(response);
        this.enviando = false;

        // Limpa mensagem de sucesso após 4 segundos
        setTimeout(() => {
          this.mensagemSucesso = '';
        }, 4000);
      },
      error: (err: any) => {
        console.error('❌ Erro ao salvar avaliação:', err);
        this.enviando = false;
        
        if (err.status === 401) {
          this.mensagemErro = 'Você precisa estar logado para avaliar';
        } else if (err.error?.message) {
          if (Array.isArray(err.error.message)) {
            this.mensagemErro = err.error.message.join(', ');
          } else {
            this.mensagemErro = err.error.message;
          }
        } else {
          this.mensagemErro = 'Erro ao enviar avaliação. Tente novamente.';
        }
      }
    });
  }
}