import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EnderecoService } from '../../services/endereco.service';

@Component({
  selector: 'app-meus-enderecos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meus-enderecos.html',
  styleUrls: ['./meus-enderecos.scss']
})
export class MeusEnderecos implements OnInit {

  enderecos: any[] = [];
  enderecoForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private enderecoService: EnderecoService
  ) {}

  ngOnInit(): void {
    this.enderecoForm = this.fb.group({
      rua: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],
      cep: ['', Validators.required],
      cidade: ['', Validators.required],
      estado: ['', Validators.required]
    });

    this.carregarEnderecos();
  }

  carregarEnderecos(): void {
    this.enderecoService.getEnderecos().subscribe({
      next: (data: any) => this.enderecos = data,
      error: (err: any) => console.error('Erro ao carregar endereços', err)
    });
  }

  onSubmit(): void {
    if (this.enderecoForm.valid) {
      this.enderecoService.addEndereco(this.enderecoForm.value).subscribe({
        next: (response: any) => {
          console.log('Endereço salvo!', response);
          this.carregarEnderecos();
          this.enderecoForm.reset();
        },
        error: (err: any) => console.error('Erro ao salvar endereço', err)
      });
    }
  }
}