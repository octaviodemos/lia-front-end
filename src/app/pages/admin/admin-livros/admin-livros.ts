import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LivroService } from '../../../services/livro.service';

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
  selectedFile: File | null = null;
  selectedFileName: string = '';
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private livroService: LivroService
  ) {}

  ngOnInit(): void {
    this.livroForm = this.fb.group({
      titulo: ['', Validators.required],
      sinopse: [''],
      editora: [''],
      ano_publicacao: [null],
      isbn: [''],
      capa_url: ['']
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tamanho (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.mensagemSucesso = 'Arquivo muito grande. Tamanho máximo: 5MB';
        return;
      }
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        this.mensagemSucesso = 'Por favor, selecione uma imagem válida';
        return;
      }
      
      this.selectedFile = file;
      this.selectedFileName = file.name;
      
      // Criar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
      
      // Limpar URL se houver arquivo
      this.livroForm.patchValue({ capa_url: '' });
    }
  }
  
  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.imagePreview = null;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    console.log('Form válido?', this.livroForm.valid);
    console.log('Form value:', this.livroForm.value);
    console.log('Form errors:', this.livroForm.errors);
    
    if (this.livroForm.valid) {
      const formData = new FormData();
      
      // Adicionar campos do formulário
      Object.keys(this.livroForm.value).forEach(key => {
        const value = this.livroForm.value[key];
        if (value !== null && value !== '') {
          formData.append(key, value);
        }
      });
      
      // Adicionar arquivo se houver
      if (this.selectedFile) {
        formData.append('capa_file', this.selectedFile, this.selectedFile.name);
      }
      
      console.log('Payload sendo enviado (FormData)');
      
      this.livroService.criarLivro(formData).subscribe({
        next: (response: any) => {
          this.mensagemSucesso = `Livro "${response.titulo}" criado com sucesso!`;
          this.livroForm.reset();
          this.clearFile();
        },
        error: (err: any) => {
          console.error('Erro completo:', err);
          console.error('Status:', err.status);
          console.error('Mensagem:', err.error?.message);
          console.error('Detalhes:', err.error);
          
          if (err.status === 500) {
            this.mensagemSucesso = 'Erro interno no servidor. Verifique os logs do backend para mais detalhes.';
          } else if (Array.isArray(err.error?.message)) {
            console.error('Erros de validação:');
            err.error.message.forEach((msg: string, i: number) => {
              console.error(`  ${i + 1}. ${msg}`);
            });
            this.mensagemSucesso = err.error.message.join(', ');
          } else {
            this.mensagemSucesso = err.error?.message || 'Erro ao criar livro.';
          }
        }
      });
    }
  }

  // avaliações agora são moderadas no componente `AdminAvaliacoes`
}