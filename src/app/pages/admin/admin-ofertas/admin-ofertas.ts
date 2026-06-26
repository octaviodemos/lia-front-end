import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfertaVendaService } from '../../../services/oferta-venda.service';
import { AiService } from '../../../services/ai.service';
import type { LivroImagem } from '../../../models/livro-imagem';
import type { AvaliacaoIaOferta } from '../../../models/avaliacao-ia-oferta';
import { rotuloTipoImagemLegivel } from '../../../utils/livro-imagem-helpers';
import { resolverUrlMidiaApi } from '../../../utils/media-url';
import {
  OFFER_STATUS_OPTIONS,
  offerBadgeClass,
  getOfferFriendlyLabel,
  normalizeOfferStatusCode,
} from '../../../utils/status-utils';
import { formatarEnderecos, telefoneDoUsuario } from '../../../utils/admin-contact-utils';

@Component({
  selector: 'app-admin-ofertas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-ofertas.html',
  styleUrls: ['./admin-ofertas.scss']
})
export class AdminOfertas implements OnInit {

  ofertas: any[] = [];
  statusOptions = OFFER_STATUS_OPTIONS;
  expandidoPorId: Record<string, boolean> = {};
  iaCarregandoPorId: Record<string, boolean> = {};
  iaResultadoPorId: Record<string, AvaliacaoIaOferta | null> = {};

  constructor(
    private ofertaVendaService: OfertaVendaService,
    private aiService: AiService,
  ) {}

  getFriendlyLabel = (o: any) => getOfferFriendlyLabel(o);
  badgeClassFor = (o: any) => offerBadgeClass(o);
  formatarEnderecos = (o: any) => formatarEnderecos(o);
  telefoneDoUsuario = (o: any) => telefoneDoUsuario(o);

  getSelectedStatusValue(oferta: any): string {
    return normalizeOfferStatusCode(oferta?.status_oferta || oferta?.status);
  }

  onStatusChange(novoStatus: string, ofertaId: number | string): void {
    this.ofertaVendaService.responderOferta(String(ofertaId), {
      status_oferta: novoStatus,
    }).subscribe({
      next: () => this.carregarOfertas(),
      error: (err: any) => console.error('Erro ao atualizar status da oferta', err),
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

  iaCarregando(oferta: any): boolean {
    return !!this.iaCarregandoPorId[this.chaveOferta(oferta)];
  }

  iaResultado(oferta: any): AvaliacaoIaOferta | null {
    return this.iaResultadoPorId[this.chaveOferta(oferta)] ?? null;
  }

  estrelaPreenchida(oferta: any, indice: number): boolean {
    const r = this.iaResultado(oferta);
    if (!r) return false;
    const raw = Math.round(Number(r.nota_conservacao));
    const n = Number.isFinite(raw) ? Math.min(5, Math.max(1, raw)) : 3;
    return indice <= n;
  }

  avaliarComIa(oferta: any): void {
    const key = this.chaveOferta(oferta);
    const id = oferta?.id_oferta_venda ?? oferta?.id;
    if (id === undefined || id === null || id === '') {
      return;
    }
    if (!this.imagensDaOferta(oferta).length) {
      alert('Não há fotos para analisar nesta oferta.');
      return;
    }
    this.iaCarregandoPorId = { ...this.iaCarregandoPorId, [key]: true };
    this.aiService.avaliarOfertaComIA(Number(id)).subscribe({
      next: (r) => {
        this.iaCarregandoPorId = { ...this.iaCarregandoPorId, [key]: false };
        this.iaResultadoPorId = { ...this.iaResultadoPorId, [key]: r };
      },
      error: () => {
        this.iaCarregandoPorId = { ...this.iaCarregandoPorId, [key]: false };
        alert('A IA não conseguiu analisar as fotos. Por favor, avalie o livro manualmente.');
      },
    });
  }
}
