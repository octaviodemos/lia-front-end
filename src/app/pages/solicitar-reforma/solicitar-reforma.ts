import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReformaService } from '../../services/reforma.service';

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
  selectedFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private reformaService: ReformaService
  ) {}

  ngOnInit(): void {
    this.reformaForm = this.fb.group({
      descricao_problema: ['', Validators.required]
    });
  }

  onFileSelected(event: any): void {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  onSubmit(): void {
    if (this.reformaForm.valid && this.selectedFiles.length > 0) {
      const formData = new FormData();
      
      formData.append('descricao_problema', this.reformaForm.get('descricao_problema')?.value);
      
      this.selectedFiles.forEach((file) => {
        formData.append('fotos', file, file.name);
      });

      this.reformaService.criarSolicitacao(formData).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = 'Solicitação de reforma enviada com sucesso!';
          this.reformaForm.reset();
          this.selectedFiles = [];
        },
        error: (err: any) => {
          console.error('Erro ao enviar solicitação:', err);
          this.mensagemSucesso = 'Erro ao enviar solicitação. Tente novamente.';
        }
      });
    } else {
      alert('Por favor, preencha a descrição e anexe pelo menos uma foto.');
    }
  }
}