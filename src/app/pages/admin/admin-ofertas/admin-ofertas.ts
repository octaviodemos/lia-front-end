import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfertaVendaService } from '../../../services/oferta-venda.service';
import type { LivroImagem } from '../../../models/livro-imagem';
import { rotuloTipoImagemLegivel } from '../../../utils/livro-imagem-helpers';
import { resolverUrlMidiaApi } from '../../../utils/media-url';

@Component({
  selector: 'app-admin-ofertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-ofertas.html',
  styleUrls: ['./admin-ofertas.scss']
})
export class AdminOfertas implements OnInit {

  ofertas: any[] = [];
  respostaMap: { [key: string]: string } = {};
  expandidoPorId: Record<string, boolean> = {};

  constructor(private ofertaVendaService: OfertaVendaService) {}

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
    const target = event.target as HTMLTextAreaElement | null;
    const key = String(ofertaId);
    if (target) {
      this.respostaMap[key] = target.value || '';
      return;
    }
    const val = (event as { target?: { value?: string } })?.target?.value;
    this.respostaMap[key] = val || '';
  }

  chaveOferta(oferta: any): string {
    return String(oferta?.id_oferta_venda ?? oferta?.id ?? '');
  }

  alternarDetalhes(oferta: any): void {
    const k = this.chaveOferta(oferta);
    this.expandidoPorId = { ...this.expandidoPorId, [k]: !this.expandidoPorId[k] };
  }

  detalhesAbertos(oferta: any): boolean {
    return !!this.expandidoPorId[this.chaveOferta(oferta)];
  }

  imagensDaOferta(oferta: any): LivroImagem[] {
    const arr = oferta?.imagens;
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr.filter((i: LivroImagem) => !!(i?.url_imagem && String(i.url_imagem).trim()));
  }

  rotuloTipo(tipo: string | null | undefined): string {
    return rotuloTipoImagemLegivel(tipo);
  }

  urlMidia(url: string | null | undefined): string {
    return resolverUrlMidiaApi(url);
  }

  handleResposta(ofertaId: any, novoStatus: 'aceita' | 'recusada'): void {
    const key = String(ofertaId);
    const resposta = this.respostaMap[key] || '';

    this.ofertaVendaService.responderOferta(key, {
      status_oferta: novoStatus,
      resposta_admin: resposta
    }).subscribe({
      next: () => {
        this.carregarOfertas();
        this.respostaMap[key] = '';
      },
      error: (err: any) => console.error('Erro ao responder oferta', err)
    });
  }
}
