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

  constructor(
    private fb: FormBuilder,
    private avaliacaoService: AvaliacaoService
  ) {}

  ngOnInit(): void {
    this.avaliacaoForm = this.fb.group({
      nota: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      comentario: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.avaliacaoForm.valid) {
      this.avaliacaoService.criarAvaliacao(this.idLivro, this.avaliacaoForm.value).subscribe({
        next: (response: any) => {
          console.log('Avaliação salva!', response);
          this.avaliacaoForm.reset();
          this.avaliacaoSalva.emit(response);
        },
        error: (err: any) => {
          console.error('Erro ao salvar avaliação:', err);
        }
      });
    }
  }
}