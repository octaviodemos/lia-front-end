import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminModerationService } from '../../../services/admin-moderation.service';

@Component({
  selector: 'app-admin-avaliacoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-avaliacoes.html',
  styleUrls: ['./admin-avaliacoes.scss']
})
export class AdminAvaliacoes implements OnInit {
  pendingAvaliacoes: any[] = [];
  panelOpen: boolean = true;
  confirmApproveId: any = null;
  confirmRejectId: any = null;
  processingId: any = null;

  constructor(private adminModeration: AdminModerationService) {}

  ngOnInit(): void {
    this.carregarAvaliacoesPendentes();
  }

  carregarAvaliacoesPendentes() {
    console.log('Carregando avaliações pendentes...');
    this.adminModeration.getPendingAvaliacoes().subscribe({
      next: (res: any) => { 
        console.log('Resposta do servidor:', res);
        let avaliacoes = Array.isArray(res) ? res : (res?.data || res || []);
        
        // Filtrar apenas avaliações com status 'pendente'
        this.pendingAvaliacoes = avaliacoes.filter((a: any) => 
          a.status === 'pendente' || a.status === 'pending' || !a.status
        );
        
        console.log('Avaliações pendentes atualizadas:', this.pendingAvaliacoes);
      },
      error: (err: any) => { 
        console.error('Erro ao carregar avaliações pendentes', err); 
        this.pendingAvaliacoes = []; 
      }
    });
  }

  togglePanel() { this.panelOpen = !this.panelOpen; }

  requestApproveAvaliacao(a: any) { this.confirmApproveId = a.id_avaliacao || a.id; }
  cancelApprove() { this.confirmApproveId = null; }
  confirmApproveAvaliacao() {
    const id = this.confirmApproveId;
    if (!id) return;
    console.log('Aprovando avaliação ID:', id);
    this.processingId = id;
    this.adminModeration.approveAvaliacao(id).subscribe({
      next: (response) => {
        console.log('Avaliação aprovada com sucesso:', response);
        // Recarregar lista do servidor para garantir sincronização
        this.carregarAvaliacoesPendentes();
        this.processingId = null;
        this.confirmApproveId = null;
      },
      error: (err: any) => { 
        console.error('Erro ao aprovar avaliação:', err);
        this.processingId = null; 
        this.confirmApproveId = null;
      }
    });
  }

  requestRejectAvaliacao(a: any) { this.confirmRejectId = a.id_avaliacao || a.id; }
  cancelReject() { this.confirmRejectId = null; }
  confirmRejectAvaliacao() {
    const id = this.confirmRejectId;
    if (!id) return;
    console.log('Rejeitando avaliação ID:', id);
    this.processingId = id;
    this.adminModeration.deleteAvaliacao(id).subscribe({
      next: (response) => {
        console.log('Avaliação rejeitada com sucesso:', response);
        // Recarregar lista do servidor para garantir sincronização
        this.carregarAvaliacoesPendentes();
        this.processingId = null;
        this.confirmRejectId = null;
      },
      error: (err: any) => { 
        console.error('Erro ao rejeitar avaliação:', err);
        this.processingId = null; 
        this.confirmRejectId = null;
      }
    });
  }
}
