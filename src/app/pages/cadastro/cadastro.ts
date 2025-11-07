import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

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
      senha: ['', [Validators.required, Validators.minLength(8)]],
      confirmarSenha: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    this.mensagemErro = '';
    
    if (this.registerForm.valid) {
      const userData = {
        nome: this.registerForm.value.nome,
        email: this.registerForm.value.email,
        senha: this.registerForm.value.senha
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