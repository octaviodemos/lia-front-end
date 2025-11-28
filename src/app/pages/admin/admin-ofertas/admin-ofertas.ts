import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { OfertaVendaService } from '../../../services/oferta-venda.service';

@Component({
  selector: 'app-admin-ofertas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-ofertas.html',
  styleUrls: ['./admin-ofertas.scss']
})
export class AdminOfertas implements OnInit {

  ofertas: any[] = [];
  respostaForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private ofertaVendaService: OfertaVendaService
  ) {
    this.respostaForm = this.fb.group({
      resposta_admin: ['']
    });
  }

  ngOnInit(): void {
    this.carregarOfertas();
  }

  carregarOfertas(): void {
    this.ofertaVendaService.getAllOfertas().subscribe({
      next: (data: any) => this.ofertas = data,
      error: (err: any) => console.error('Erro ao carregar ofertas', err)
    });
  }

  handleResposta(ofertaId: string, novoStatus: 'aceita' | 'recusada'): void {
    const resposta = this.respostaForm.get('resposta_admin')?.value || '';
    
    this.ofertaVendaService.responderOferta(ofertaId, { 
      status: novoStatus, 
      resposta_admin: resposta 
    }).subscribe({
      next: (response: any) => {
        console.log('Oferta respondida!', response);
        this.carregarOfertas();
        this.respostaForm.reset();
      },
      error: (err: any) => console.error('Erro ao responder oferta', err)
    });
  }
}