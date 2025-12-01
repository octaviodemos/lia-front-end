import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReformaService } from '../../../services/reforma.service';
import { getFriendlyLabel, badgeClass } from '../../../utils/status-utils';

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
}