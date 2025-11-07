import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit {
  
  loginForm!: FormGroup;
  mensagemErro: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    this.mensagemErro = '';

    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (response: any) => {
          console.log('Login bem-sucedido!', response);
          this.router.navigate(['/']); 
        },
        error: (err: any) => {
          console.error('Erro no login:', err);
          if (err.error && err.error.message) {
            this.mensagemErro = err.error.message;
          } else {
            this.mensagemErro = 'Erro ao fazer login. Tente novamente.';
          }
        }
      });
    } else {
      this.mensagemErro = 'Formulário inválido. Verifique os campos.';
    }
  }
}