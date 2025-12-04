import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
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
  respostaMap: { [key: string]: string } = {};

  constructor(
    private ofertaVendaService: OfertaVendaService
  ) {}

  ngOnInit(): void {
    this.carregarOfertas();
  }

  carregarOfertas(): void {
    this.ofertaVendaService.getAllOfertas().subscribe({
      next: (data: any) => this.ofertas = data,
      error: (err: any) => console.error('Erro ao carregar ofertas', err)
    });
  }

  onRespostaInput(ofertaId: any, event: Event): void {
    try {
      const target = event.target as HTMLTextAreaElement | null;
      if (!target) return;
      this.respostaMap[String(ofertaId)] = target.value || '';
    } catch (e) {
      // fallback: try any cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (event as any)?.target?.value;
      this.respostaMap[String(ofertaId)] = val || '';
    }
  }

  handleResposta(ofertaId: any, novoStatus: 'aceita' | 'recusada'): void {
    const key = String(ofertaId);
    const resposta = this.respostaMap[key] || '';

    this.ofertaVendaService.responderOferta(key, { 
      status_oferta: novoStatus, 
      resposta_admin: resposta 
    }).subscribe({
      next: (response: any) => {
        console.log('Oferta respondida!', response);
        this.carregarOfertas();
        this.respostaMap[key] = '';
      },
      error: (err: any) => console.error('Erro ao responder oferta', err)
    });
  }
}