import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReformaService } from '../../../services/reforma.service';
import { getFriendlyLabel, badgeClass } from '../../../utils/status-utils';
import { rotuloTipoImagemLegivel } from '../../../utils/livro-imagem-helpers';
import { resolverUrlMidiaApi } from '../../../utils/media-url';

@Component({
  selector: 'app-admin-reformas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reformas.html',
  styleUrls: ['./admin-reformas.scss']
})
export class AdminReformas implements OnInit {

  solicitacoes: any[] = [];
  total: number = 0;
  page: number = 1;
  perPage: number = 20;
  q: string = '';
  filterStatus: string = '';

  statusOptions: Array<{ value: string; label: string }> = [
    { value: '', label: 'Todos os status' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'IN_PROGRESS', label: 'Em andamento' },
    { value: 'COMPLETED', label: 'Concluído' },
    { value: 'REJECTED', label: 'Rejeitado' }
  ];

  constructor(private reformaService: ReformaService) { }

  // expose helpers to template
  getFriendlyLabel = (p: any) => getFriendlyLabel(p);
  badgeClassFor = (p: any) => badgeClass(p);

  // compute which option value should be selected for a given solicitacao
  getSelectedStatusValue(solicitacao: any): string {
    const current = (solicitacao?.status_solicitacao || solicitacao?.status || '').toString();
    if (!current) return '';

    const byValue = this.statusOptions.find(o => o.value && o.value.toString().toLowerCase() === current.toString().toLowerCase());
    if (byValue) return byValue.value;

    const byLabel = this.statusOptions.find(o => o.label && o.label.toString().toLowerCase() === current.toString().toLowerCase());
    if (byLabel) return byLabel.value;

    const byValueUpper = this.statusOptions.find(o => o.value && o.value.toString().toUpperCase() === current.toString().toUpperCase());
    if (byValueUpper) return byValueUpper.value;

    return '';
  }

  ngOnInit(): void {
    this.loadSolicitacoes();
  }

  loadSolicitacoes(): void {
    const opts: any = { page: this.page, limit: this.perPage, status: this.filterStatus || undefined, q: this.q || undefined };
    this.reformaService.getAdminRepairs(opts).subscribe({
      next: (res: any) => {
        this.solicitacoes = res?.data || res?.items || [];
        this.total = res?.total || (Array.isArray(res) ? res.length : 0);
      },
      error: (err: any) => console.error('Erro ao carregar solicitações', err)
    });
  }

  onSearch() {
    this.page = 1;
    this.loadSolicitacoes();
  }

  changePage(next: number) {
    this.page = next;
    this.loadSolicitacoes();
  }

  onStatusChange(novoStatus: string, solicitacaoId: string): void {
    this.reformaService.responderSolicitacao(solicitacaoId, novoStatus).subscribe({
      next: (response: any) => {
        console.log('Status atualizado!', response);
        setTimeout(() => this.loadSolicitacoes(), 200);
      },
      error: (err: any) => console.error('Erro ao atualizar status', err)
    });
  }

  midiasSolicitacao(s: any): Array<{ url: string; tipo: string }> {
    const imagens = s?.imagens;
    if (Array.isArray(imagens) && imagens.length) {
      return imagens
        .filter((i: any) => i?.url_imagem && String(i.url_imagem).trim())
        .map((i: any) => ({ url: String(i.url_imagem), tipo: String(i.tipo_imagem ?? '') }));
    }
    const fotos = s?.fotos || [];
    return fotos
      .map((f: any) => {
        if (typeof f === 'string') {
          return { url: f, tipo: '' };
        }
        const url = f?.url_foto || f?.url_imagem || '';
        const tipo = f?.tipo_imagem != null ? String(f.tipo_imagem) : '';
        return { url: String(url), tipo };
      })
      .filter((m: { url: string }) => !!m.url.trim());
  }

  rotuloMidia(tipo: string): string {
    return tipo ? rotuloTipoImagemLegivel(tipo) : 'Foto';
  }

  urlMidia(url: string): string {
    return resolverUrlMidiaApi(url);
  }
}