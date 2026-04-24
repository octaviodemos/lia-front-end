import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmarSenha');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    if (confirmPassword?.hasError('passwordMismatch')) {
      const errors = { ...confirmPassword.errors };
      delete errors['passwordMismatch'];
      confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
    }
    return null;
  }
};

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './cadastro.html',
  styleUrls: ['./cadastro.scss']
})
export class Cadastro implements OnInit {
  
  registerForm!: FormGroup;
  mensagemErro: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    this.mensagemErro = '';
    
    if (this.registerForm.valid) {
      const userData = {
        nome: this.registerForm.value.nome,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password,
        tipo_usuario: 'cliente'
      };

      this.authService.register(userData).subscribe({
        next: (response: any) => {
          console.log('Usuário cadastrado com sucesso!', response);
          this.router.navigate(['/login']);
        },
        error: (err: any) => {
          console.error('Erro ao cadastrar usuário:', err);
          if (err.error && err.error.message) {
            this.mensagemErro = err.error.message;
          } else {
            this.mensagemErro = 'Erro ao cadastrar. Tente novamente mais tarde.';
          }
        }
      });
    } else {
      this.mensagemErro = 'Formulário inválido. Verifique os campos.';
    }
  }
}