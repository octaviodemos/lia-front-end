import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReformaService } from '../../../services/reforma.service';
import {
  REPAIR_STATUS_OPTIONS,
  REPAIR_KANBAN_COLUMNS,
  repairBadgeClass,
  getRepairFriendlyLabel,
  normalizeRepairStatusCode,
} from '../../../utils/status-utils';
import { formatarEnderecos, telefoneDoUsuario } from '../../../utils/admin-contact-utils';
import { AdminViewMode, KanbanItemMovedEvent } from '../../../utils/admin-kanban-utils';
import { AdminKanbanBoardComponent } from '../../../components/admin-kanban-board/admin-kanban-board.component';
import { rotuloTipoImagemLegivel } from '../../../utils/livro-imagem-helpers';
import { resolverUrlMidiaApi } from '../../../utils/media-url';

export type ReformaIaAvaliacao = {
  gravidade: string;
  orcamento_estimado: number;
  descricao: string;
};

@Component({
  selector: 'app-admin-reformas',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminKanbanBoardComponent],
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
  viewMode: AdminViewMode = 'list';

  iaCarregandoPorId: Record<string, boolean> = {};
  iaResultadoPorId: Record<string, ReformaIaAvaliacao | null> = {};

  statusOptions = REPAIR_STATUS_OPTIONS;
  kanbanColumns = REPAIR_KANBAN_COLUMNS;

  constructor(private reformaService: ReformaService) { }

  getFriendlyLabel = (s: any) => getRepairFriendlyLabel(s);
  badgeClassFor = (s: any) => repairBadgeClass(s);
  formatarEnderecos = (s: any) => formatarEnderecos(s);
  telefoneDoUsuario = (s: any) => telefoneDoUsuario(s);

  getSelectedStatusValue(solicitacao: any): string {
    return normalizeRepairStatusCode(solicitacao?.status_solicitacao || solicitacao?.status);
  }

  setViewMode(mode: AdminViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.page = 1;
    if (mode === 'kanban') {
      this.filterStatus = '';
    }
    this.loadSolicitacoes();
  }

  onKanbanItemMoved(event: KanbanItemMovedEvent<any>): void {
    this.onStatusChange(event.toStatus, event.item.id_solicitacao || event.item.id);
  }

  ngOnInit(): void {
    this.loadSolicitacoes();
  }

  chaveSolicitacao(s: any): string {
    return String(s?.id_solicitacao ?? s?.id ?? '');
  }

  iaCarregando(s: any): boolean {
    return !!this.iaCarregandoPorId[this.chaveSolicitacao(s)];
  }

  iaResultado(s: any): ReformaIaAvaliacao | null {
    return this.iaResultadoPorId[this.chaveSolicitacao(s)] ?? null;
  }

  avaliarComIa(s: any): void {
    const key = this.chaveSolicitacao(s);
    const id = s?.id_solicitacao ?? s?.id;
    if (id === undefined || id === null || id === '') {
      return;
    }
    if (!this.midiasSolicitacao(s).length) {
      return;
    }
    this.iaCarregandoPorId = { ...this.iaCarregandoPorId, [key]: true };
    this.reformaService.avaliarReformaComIA(id).subscribe({
      next: (r) => {
        this.iaCarregandoPorId = { ...this.iaCarregandoPorId, [key]: false };
        this.iaResultadoPorId = { ...this.iaResultadoPorId, [key]: r };
      },
      error: () => {
        this.iaCarregandoPorId = { ...this.iaCarregandoPorId, [key]: false };
        alert('Não foi possível obter a avaliação da IA para esta solicitação.');
      },
    });
  }

  loadSolicitacoes(): void {
    const limit = this.viewMode === 'kanban' ? 500 : this.perPage;
    const status = this.viewMode === 'kanban' ? undefined : (this.filterStatus || undefined);
    const opts: any = { page: this.page, limit, status, q: this.q || undefined };
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
      error: (err: any) => {
        console.error('Erro ao atualizar status', err);
        this.loadSolicitacoes();
      }
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
