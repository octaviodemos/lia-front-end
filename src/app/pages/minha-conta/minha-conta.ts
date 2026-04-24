import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { OfertaVendaService } from '../../services/oferta-venda.service';
import { ReformaService } from '../../services/reforma.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-minha-conta',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './minha-conta.html',
  styleUrls: ['./minha-conta.scss'],
})
export class MinhaConta implements OnInit {
  ofertas: any[] = [];
  solicitacoes: any[] = [];
  perfilForm!: FormGroup;
  carregandoPerfil = true;
  salvandoPerfil = false;
  mensagemPerfil: string = '';

  constructor(
    private ofertaVendaService: OfertaVendaService,
    private reformaService: ReformaService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.perfilForm = this.fb.group({
      nome: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      telefone: [''],
    });
    this.carregarPerfil();
    this.ofertaVendaService.getMinhasOfertas().subscribe({
      next: (data: any) => (this.ofertas = data),
      error: (err: any) => console.error('Erro ao buscar ofertas', err),
    });
    this.reformaService.getMinhasSolicitacoes().subscribe({
      next: (data: any) => (this.solicitacoes = data),
      error: (err: any) => console.error('Erro ao buscar solicitações', err),
    });
  }

  private carregarPerfil(): void {
    this.authService.getCurrentUser().subscribe({
      next: (p: any) => {
        this.perfilForm.patchValue({
          nome: p.nome || '',
          email: p.email || '',
          telefone: p.telefone || '',
        });
        this.carregandoPerfil = false;
      },
      error: () => {
        const u = this.authService.getUser();
        if (u) {
          this.perfilForm.patchValue({
            nome: u.nome || '',
            email: u.email || '',
            telefone: u.telefone || '',
          });
        }
        this.carregandoPerfil = false;
      },
    });
  }

  salvarTelefone(): void {
    this.mensagemPerfil = '';
    this.salvandoPerfil = true;
    const telefone = this.perfilForm.get('telefone')?.value;
    this.authService.updateProfile({ telefone: telefone || '' }).subscribe({
      next: (u: any) => {
        this.salvandoPerfil = false;
        this.mensagemPerfil = 'Telefone atualizado com sucesso.';
        const at = this.authService.getUser();
        if (at) {
          localStorage.setItem(
            'lia_user',
            JSON.stringify({ ...at, telefone: u.telefone, nome: u.nome, email: u.email })
          );
        }
        this.perfilForm.patchValue({ telefone: u.telefone || '' });
      },
      error: (err) => {
        this.salvandoPerfil = false;
        this.mensagemPerfil = err?.error?.message || 'Não foi possível salvar o telefone.';
      },
    });
  }
}
