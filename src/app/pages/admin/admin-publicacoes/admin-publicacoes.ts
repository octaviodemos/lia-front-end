import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminModerationService } from '../../../services/admin-moderation.service';

@Component({
  selector: 'app-admin-publicacoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-publicacoes.html',
  styleUrls: ['./admin-publicacoes.scss']
})
export class AdminPublicacoes implements OnInit {
  comentarios: any[] = [];
  loading = true;

  constructor(private adminMod: AdminModerationService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.loading = true;
    this.adminMod.getPendingComentarios().subscribe({
      next: (res: any) => {
        this.comentarios = Array.isArray(res) ? res : (res?.data || res || []);
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Erro ao buscar comentários pendentes', err);
        this.comentarios = [];
        this.loading = false;
      }
    });
  }

  approveComentario(id: any) {
    this.adminMod.approveComentario(String(id)).subscribe({ next: () => this.removeById(id), error: () => alert('Erro ao aprovar') });
  }

  deleteComentario(id: any) {
    if (!confirm('Confirma remoção do comentário?')) return;
    this.adminMod.deleteComentario(String(id)).subscribe({ next: () => this.removeById(id), error: () => alert('Erro ao remover') });
  }

  private removeById(id: any) {
    const idx = this.comentarios.findIndex(c => String(c.id_comentario || c.id) === String(id));
    if (idx >= 0) this.comentarios.splice(idx, 1);
  }
}
