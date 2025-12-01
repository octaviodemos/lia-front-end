import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminModerationService } from '../../../services/admin-moderation.service';

@Component({
  selector: 'app-admin-pendentes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-pendentes.html',
  styleUrls: ['./admin-pendentes.scss']
})
export class AdminPendentes implements OnInit {
  avaliations: any[] = [];
  comentarios: any[] = [];
  offers: any[] = [];
  repairs: any[] = [];
  loading = true;

  constructor(private admin: AdminModerationService) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll() {
    this.loading = true;
    this.offers = [];
    this.repairs = [];
    let remaining = 2;

    const done = () => { remaining -= 1; if (remaining <= 0) this.loading = false; };

    // fetch evaluations
    this.admin.getPendingAvaliacoes().subscribe({
      next: (res: any) => { this.avaliations = Array.isArray(res) ? res : (res?.data || res || []); done(); },
      error: () => { this.avaliations = []; done(); }
    });

    // fetch comments
    this.admin.getPendingComentarios().subscribe({
      next: (res: any) => { this.comentarios = Array.isArray(res) ? res : (res?.data || res || []); done(); },
      error: () => { this.comentarios = []; done(); }
    });
  }

  approveAvaliacao(id: any) {
    this.admin.approveAvaliacao(String(id)).subscribe({ next: () => this.removeItemById(this.avaliations, id), error: () => alert('Erro ao aprovar') });
  }

  deleteAvaliacao(id: any) {
    if (!confirm('Confirma remoção da avaliação?')) return;
    this.admin.deleteAvaliacao(String(id)).subscribe({ next: () => this.removeItemById(this.avaliations, id), error: () => alert('Erro ao remover') });
  }

  approveComentario(id: any) {
    this.admin.approveComentario(String(id)).subscribe({ next: () => this.removeItemById(this.comentarios, id), error: () => alert('Erro ao aprovar comentário') });
  }

  deleteComentario(id: any) {
    if (!confirm('Confirma remoção do comentário?')) return;
    this.admin.deleteComentario(String(id)).subscribe({ next: () => this.removeItemById(this.comentarios, id), error: () => alert('Erro ao remover comentário') });
  }

  private removeItemById(list: any[], id: any) {
    const idx = list.findIndex(i => String(i.id_avaliacao || i.id_comentario || i.id || i.id_offer || i.id_repair) === String(id));
    if (idx >= 0) list.splice(idx, 1);
  }
}
