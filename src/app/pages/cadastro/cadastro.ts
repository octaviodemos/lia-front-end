import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  // ... imports e selector
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.scss']
})
export class Cadastro implements OnInit {

  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService 
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenha: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.valid) {

      const userData = {
        nome: this.registerForm.value.nome,
        email: this.registerForm.value.email,
        senha: this.registerForm.value.senha
      };

      this.authService.register(userData).subscribe({
        next: (response) => {
          console.log('Usuário cadastrado com sucesso!', response);
        },
        error: (err) => {
          console.error('Erro ao cadastrar usuário:', err);
        }
      });

    } else {
      console.log('Formulário inválido. Verifique os campos.');
    }
  }
}